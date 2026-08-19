// ai-office/src-tauri/src/main.rs
// AI Office 桌面端外壳(Tauri 2):
//   - dev 模式:直接加载 tauri.conf.json 中的 devUrl(Vite 5173),beforeDevCommand 已起 Vite+Node
//   - prod 模式:动态端口拉起 node dist/server.js(传 AI_OFFICE_STATIC=dist-web),窗口加载该地址
//   - pick_workspace_dir:原生目录选择器,前端点击「打开文件夹」时调用
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
#[cfg(not(debug_assertions))]
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
#[cfg(not(debug_assertions))]
use std::time::{Duration, Instant};

use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

/// 后端 Node 服务子进程(仅 prod 模式使用;应用退出时清理)
#[cfg(not(debug_assertions))]
struct ServerProcess(Mutex<Option<Child>>);
#[cfg(debug_assertions)]
struct ServerProcess(Mutex<Option<()>>);

/// 原生目录选择器:返回用户选中的目录绝对路径(取消则 None)
/// 注意必须为 async:Tauri 同步命令跑在主线程,blocking 对话框会死锁导致界面卡死
#[tauri::command]
async fn pick_workspace_dir(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let picked = app.dialog().file().blocking_pick_folder();
    Ok(picked.and_then(|p| p.into_path().ok()).map(|x| x.to_string_lossy().to_string()))
}

/// 获取一个随机空闲端口(bind 后立即释放,供后端服务监听)
#[cfg(not(debug_assertions))]
fn free_port() -> u16 {
    std::net::TcpListener::bind(("127.0.0.1", 0))
        .ok()
        .and_then(|l| l.local_addr().ok())
        .map(|a| a.port())
        .unwrap_or(3001)
}

/// 应用根目录:
///   - exe 在 <ai-office>/src-tauri/target/<profile>/
///   - 向上 3 级 → <ai-office>/
#[cfg(not(debug_assertions))]
fn app_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|e| e.parent().map(PathBuf::from))
        .unwrap_or_else(|| PathBuf::from("."))
        .join("../../..")
}

/// prod 模式:启动后端 Node 服务子进程
/// 传 AI_OFFICE_STATIC=dist-web 让后端启用静态文件 + SPA 回退服务
#[cfg(not(debug_assertions))]
fn spawn_server(port: u16) -> Result<Child, String> {
    let node = std::env::var("AI_OFFICE_NODE").unwrap_or_else(|_| "node".into());
    let entry = std::env::var("AI_OFFICE_SERVER_ENTRY")
        .unwrap_or_else(|_| app_dir().join("dist/server.js").to_string_lossy().to_string());
    let static_dir = app_dir().join("dist-web").to_string_lossy().to_string();
    let cwd = app_dir();
    Command::new(&node)
        .arg(&entry)
        .current_dir(&cwd)
        .env("PORT", port.to_string())
        .env("AI_OFFICE_STATIC", static_dir)
        .env("NODE_ENV", "production")
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|e| format!("启动后端服务失败(node={node}, entry={entry}): {e}"))
}

/// 轮询等待后端服务端口就绪(prod 模式)
#[cfg(not(debug_assertions))]
fn wait_ready(port: u16, timeout: Duration) -> Result<(), String> {
    let deadline = Instant::now() + timeout;
    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], port));
    loop {
        if std::net::TcpStream::connect_timeout(&addr, Duration::from_millis(400)).is_ok() {
            return Ok(());
        }
        if Instant::now() > deadline {
            return Err(format!("等待后端服务就绪超时(port={port})"));
        }
        std::thread::sleep(Duration::from_millis(150));
    }
}

fn main() {
    tauri::Builder::default()
        .manage(ServerProcess(Mutex::new(None)))
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![pick_workspace_dir])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                // dev 模式:beforeDevCommand 已拉起 Vite(5173) + Node(3001)
                // tauri.conf.json 的 devUrl 已经告诉 Tauri 默认窗口加载 localhost:5173
                // 这里只是再手动显式创建一次主窗口,统一窗口名/大小/标题
                let dev_url: tauri::Url = "http://localhost:5173"
                    .parse()
                    .expect("invalid dev url");
                tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::External(dev_url))
                    .title("AI Office")
                    .inner_size(1280.0, 820.0)
                    .min_inner_size(960.0, 640.0)
                    .build()?;
            }

            #[cfg(not(debug_assertions))]
            {
                // prod 模式:动态端口起 Node 服务,窗口直接加载 http://127.0.0.1:<port>(同源,零 CORS)
                let port = free_port();
                let child = spawn_server(port).map_err(std::io::Error::other)?;
                *app.state::<ServerProcess>().0.lock().unwrap() = Some(child);
                wait_ready(port, Duration::from_secs(30)).map_err(std::io::Error::other)?;

                let url: tauri::Url = format!("http://127.0.0.1:{port}").parse().unwrap();
                tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::External(url))
                    .title("AI Office")
                    .inner_size(1280.0, 820.0)
                    .min_inner_size(960.0, 640.0)
                    .build()?;
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("构建 Tauri 应用失败,请检查 src-tauri/ 配置")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                // 退出时,清理可能运行的 Node 后端子进程(prod 模式持有)
                #[cfg(not(debug_assertions))]
                if let Some(mut child) = app_handle.state::<ServerProcess>().0.lock().unwrap().take() {
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
        });
}
