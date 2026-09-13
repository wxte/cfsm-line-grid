# Atlas

Cloudflare Server Monitor 的第三方监控主题。

当前版本：**v0.5.14**

Atlas 使用原生 HTML / CSS / JavaScript，目标是保留 CF-Server-Monitor 的实时监控能力，同时采用更克制、紧凑的工具型界面。当前设计语言参考 ThreeUI 的中性色层级、细边框、小圆角、等宽信息标签与轻量微交互。

## 主要功能

- 概览 / 节点 / 网络三个主视图
- 原生 WebSocket 实时更新，HTTP 轮询兜底
- CPU / RAM / DISK、实时上下行、本周期流量
- 联通 / 电信 / 移动延迟与丢包历史
- 1H / 6H / 24H / 7D 网络历史
- COBE 点阵地球与地区筛选联动
- 桌面节点支持列表 / 双列卡片两种布局，并记住选择
- 手机端自适应节点卡和网络图切换
- 节点详情原位展开
- 服务器离线 / 恢复上线活动记录
- 浅色 / 深色 / 跟随系统
- 后台 favicon、站点标题和主题偏好联动
- 单一运行时样式表 `assets/atlas.css`
- 不依赖第三方字体 CDN

## 安装

在 CF-Server-Monitor 后台进入第三方 / 自定义主题设置，主题 URL 填写：

```text
https://github.com/wxte/CFSM-Theme-Atlas/tree/main
```

管理后台入口仍由 CF-Server-Monitor 提供：

```text
/admin#admin
```

如果浏览器仍显示旧样式，优先确认：

1. `package.json` 中的版本号
2. 页脚显示的 Atlas 版本
3. `index.html` 中 CSS / JS 的 `?v=` 缓存参数
4. Cloudflare 或浏览器缓存是否仍命中旧文件

## 后台设置联动

Atlas 直接使用 CF-Server-Monitor 已有的公开配置，不重复创建一套主题设置。

- `site_title`：显示在 Atlas 品牌旁，并作为浏览器页面标题
- `favicon`：作为左上角品牌图标；加载失败时使用内置图标兜底
- `preferred_theme`：首次访问时决定浅色 / 深色 / 跟随系统
- `custom_cu_name`：联通自定义名称
- `custom_ct_name`：电信自定义名称
- `custom_cm_name`：移动自定义名称
- `custom_bd_name`：BGP 自定义名称
- `show_price`：是否显示价格
- `show_expire`：是否显示到期信息
- `show_tf`：是否显示流量
- `show_three_net_details`：是否显示三网详情
- `version`：显示 CF-Server-Monitor 后端版本

## 概览

概览页用于快速查看整体状态：

- 节点总数与在线 / 离线数量
- 覆盖地区
- 实时下载 / 上传
- 本周期总流量
- 月费折算
- 地区分布
- 全球节点地球
- 节点列表

详细线路质量不在概览重复展示，统一放在“网络”页。

## 节点列表

每台服务器显示：

- 在线 / 离线状态
- 节点名称
- 系统标志
- 自定义分组（默认 `Default` 不显示）
- 架构、CPU 核数、内存
- 地区
- 实时上下行
- CPU / RAM / DISK
- 本周期流量与配额
- 联通 / 电信 / 移动延迟
- 运行时间

正常资源进度条使用中性色；高负载或严重异常才使用警告色。

点击节点名称或详情按钮后，在当前卡片中展开：

- CPU / 下行 / 上行趋势
- CPU 型号
- 系统与内核
- 负载 / 进程
- TCP / UDP
- 价格
- 到期时间
- 本周期上下行

## 网络

网络页支持：

- 实时
- 1H
- 6H
- 24H
- 7D

实时模式使用当前页面收到的数据形成短时间窗口；历史模式读取 CF-Server-Monitor 的服务端历史。

桌面同时展示联通 / 电信 / 移动；手机使用三个切换按钮，一次展示一条线路，避免横向滚动。

## 活动记录

当前活动页只关注真正有用的服务器状态变化：

- 服务器离线
- 服务器恢复上线

前端最多展示最近 100 条。

目前记录使用浏览器本地存储，因此刷新页面不会丢失，但清除站点数据或更换浏览器后不会同步。后续计划将上下线事件迁移到 CF-Server-Monitor 的 D1 数据库，实现跨设备和页面关闭期间的持久记录。

## 数据来源

Atlas 使用 CF-Server-Monitor 提供的接口，包括：

```text
/api/config
/api/servers
/api/ws?subscribe=all
```

以及历史网络数据接口。

实时监控以 WebSocket 为主，HTTP 请求用于初始化、历史数据读取和断线兜底。

## 性能与样式

- 单一运行时 CSS：`assets/atlas.css`
- 本地 JetBrains Mono 字体资源；中文使用系统中文字体
- 非关键模块延迟加载
- 地球离屏时停止不必要渲染
- 网络历史按时间范围下采样
- 支持 `prefers-reduced-motion`
- 浅色 / 暗色均有小字号对比度测试

## 开发检查

Windows PowerShell：

```powershell
npm.cmd run check
npm.cmd test
```

当前测试目标应全部通过。

## 仓库

```text
https://github.com/wxte/CFSM-Theme-Atlas
```

CF-Server-Monitor：

```text
https://github.com/huilang-me/CF-Server-Monitor
```

## License

主题代码按仓库中的许可证文件执行；CF-Server-Monitor 本体遵循其上游项目许可证。


## v0.5.11 性能整理

- 桌面节点固定为长条列表，移除实验性的双列大卡片切换、相关 localStorage 与主要卡片样式。
- WebSocket 高频更新只即时刷新发生变化的节点；地区统计与 KPI 仅在概览页合并刷新，避免网络页/节点页做无用概览计算。
- 移除未使用的 Geist / Atlas Latin 字体请求，监控数字统一使用本地 JetBrains Mono。
- 手机端保持现有单列节点布局不变。


## v0.5.12 流量进度条

- 本周期流量继续保留为重要信息。
- 底轨改为浅灰圆角胶囊点，已用部分为中灰圆角胶囊点，不再出现突兀的实心黑块。
- 仅修改 quota/progress；展开详情里的网络采样点阵保持不变。


## v0.5.13 系统图标

- 参考 NezhaDash inline 列表的系统标识视觉比例，放大 Atlas 节点 OS 图标。
- Debian / Ubuntu 等因 SVG 留白不同分别做视觉缩放；文字字号不放大。
- 手机端图标额外增加 1px，保证小屏可辨识。


## v0.5.14 系统身份布局

- OS 图标从小 badge 中移出，放到节点名称左侧作为独立系统身份标志。
- 桌面约 22px，手机约 25px；系统名称改为轻量次级文字。
- 删除已失效的 v0.5.13 OS 图标尺寸测试。
