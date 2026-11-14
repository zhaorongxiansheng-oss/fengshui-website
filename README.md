# 昭荣书院 · 风水咨询网站

一个无需额外依赖即可运行的完整风水咨询网站，包含：

- 网站首页与网站介绍（首页、服务项目、咨询流程、联系我们）
- 在线登记信息窗口（表单提交后写入数据库）
- SQLite 数据库存储（使用 Node.js 内置的 `node:sqlite`）
- 带简单密码保护的登记管理后台（查看、搜索、修改状态、删除）
- 网站信息管理后台（修改 Logo、首页大图、网站标题与名称、导航与各板块文字、联系方式，服务项目可增删改、图标可换图，首页自动更新）

## 运行环境

- Node.js 22.5 或更高版本（项目已使用 Node 24 验证）
- 无需 npm install，全部使用 Node.js 内置模块

## 启动

```bash
node server.js
```

启动后访问：

- 首页：<http://localhost:3000/>
- 在线登记：<http://localhost:3000/register.html>
- 管理后台：<http://localhost:3000/admin.html>
- 网站信息管理：<http://localhost:3000/content.html>

## 开机自动启动

已创建 Windows 计划任务 `ZhaoRongShuyuanWebsite`，用户登录后会以隐藏窗口方式自动运行 `node server.js`。

- 启动脚本：`start-website.vbs`
- 如需手动启动任务：`Start-ScheduledTask -TaskName "ZhaoRongShuyuanWebsite"`
- 如需删除任务：`Unregister-ScheduledTask -TaskName "ZhaoRongShuyuanWebsite"`

注意：如果 Codex 运行时更新导致 `node.exe` 路径变化，需要同步修改 `start-website.vbs` 中的 `nodePath`。

## 管理后台

默认管理密码为 `admin888`。正式使用时建议通过环境变量修改：

```bash
# Windows PowerShell
$env:ADMIN_PASSWORD = "你的新密码"
node server.js
```

## 数据库

数据保存在 `data/fengshui.db`（SQLite 文件），首次启动会自动创建数据表。`data/` 目录已加入 `.gitignore`。

## 部署到 Uppcoder

项目已适配 Uppcoder 的启动方式（提供 `index.js` 与 `startup-app.sh`，并支持平台注入的 `APP_PORT` 环境变量）。部署步骤：

1. 把本项目推送到一个 GitHub 仓库。
2. 登录 <https://portal.uppcoder.com>，进入 Stacks，选择「Express + SQLite」模板创建 Stack（本应用使用 Node 内置 SQLite，不需要额外添加数据库组件）。
3. 在配置页关联你的 GitHub 仓库，然后点击 Deploy 并确认。
4. 部署完成后访问平台分配的 HTTPS 地址即可。

本项目无第三方 npm 依赖，运行 Node.js 22.5+（平台 Node 22.13 已满足）。

## 接口说明

- `POST /api/registrations`：提交登记信息
- `GET /api/registrations?q=&status=`：查询登记信息（需登录）
- `PATCH /api/registrations/:id`：修改处理状态（需登录）
- `DELETE /api/registrations/:id`：删除登记信息（需登录）
- `GET /api/settings/public`：读取网站公开信息（用于首页展示）
- `GET /api/settings`：读取网站信息（需登录）
- `PUT /api/settings`：修改网站信息（需登录）
- `POST /api/settings/logo`：上传 Logo 图片（需登录）
- `DELETE /api/settings/logo`：移除 Logo 图片（需登录）
- `POST /api/settings/hero-image`：上传首页大图（需登录）
- `DELETE /api/settings/hero-image`：移除首页大图（需登录）
- `GET /api/items`：读取服务项目列表
- `POST /api/items`：新增服务项目（需登录）
- `PATCH /api/items/:id`：修改服务项目（需登录）
- `DELETE /api/items/:id`：删除服务项目（需登录）
- `POST /api/items/:id/icon`：上传项目图标图片（需登录）
- `DELETE /api/items/:id/icon`：移除项目图标图片（需登录）
- `POST /api/login`：管理后台登录
- `GET /api/health`：服务健康检查
