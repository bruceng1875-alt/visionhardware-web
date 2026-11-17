# 独立测试环境准备记录

日期：2026-11-14。未推送、未部署、未创建云资源、未发送邮件。

已增加独立的 wrangler.local.json、本地 D1 迁移配置、wrangler.staging.example.json 和 scripts/check-staging.mjs。
测试配置初始关闭询盘与邮件，没有生产域名路由；资源 ID 和域名都是明确待填写项，没有冒充已存在资源。检查器会拒绝未填配置、生产域名、错误 Worker 名、明文密钥和提前开启的收集/邮件开关。通过静态检查也不能证明账户或数据库归属正确。

21 项 Node/SQLite 测试通过。另使用 Cloudflare workerd + Miniflare 本地 D1 做并发测试，5 次同键提交得到同一编号，数据库一条询盘、一个通知任务；冲突内容返回 409，非法数量返回 400。

环境限制：现有模拟器最高支持 2026-10-13，而生产配置是 2026-11-01。补充 D1 测试明确使用 2026-10-13，未改变生产配置；完全匹配生产日期的测试仍待完成。当前 Wrangler whoami 返回未登录。

后续顺序：
1. 用户完成 Cloudflare 登录，指定测试收件箱。不要把账户密码/API 密钥贴到聊天中。
2. 只读核对账户、生产 Worker 和已有资源，确认独立测试 Worker/D1 名称未被其他用途占用。
3. 创建独立资源后才填实际 ID/域名；先部署询盘关闭的版本，检查页面、API、noindex 和路由隔离。
4. 接入前端真实 Turnstile（当前页面仍仅本地启用）、服务端密钥、限流绑定、邮件服务与测试隐私告知，验证故障恢复与收件。邮件服务适配器不代表服务账户已经开通。
5. 配置定时通知恢复和独立告警。确认测试通过后再安排客户资料接入与生产审核。

参考：https://developers.cloudflare.com/workers/wrangler/configuration/ ，https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/ 。

## 2026-11-16 云端进展
设备授权成功，账户 7ebf38b74fc6d399f03a288c0684d4e7。只读列表确认原有库仅 nexkitra-inquiries-staging。
已新建独立库 visionhardware-rfq-staging，ID 1b05d521-914b-4920-85a4-20bd48b44a9e；0001_inquiries.sql 远程迁移成功。
wrangler.staging.json 静态隔离检查通过，询盘/邮件/隐私开关保持 false，routes 为空。
部署 visionhardware-web-staging 在读取 deployments 时返回 No access to the specified resource，尚无成功部署证据。当前 OAuth 授权含 workers:write，但 whoami 提示缺 workers_scripts:write；后续需补充对应脚本权限并重新验证。未修改生产配置，未发邮件。

### 2026-11-16 测试站部署结果
补充 workers_scripts:write 后授权成功。首次上传已有部署记录，但 triggers 配置返回 10007；重试后 deploy 成功。
独立 Worker：visionhardware-web-staging
测试地址：https://visionhardware-web-staging.bruceng1875.workers.dev
版本：4a01ab05-ba52-4969-b1a8-d9eea906d92f
绑定：visionhardware-rfq-staging。INQUIRIES_ENABLED=false，ALLOW_EMAIL_SEND=false，PRIVACY_APPROVED=false。
未修改正式域名路由。测试地址 curl 请求网络超时，不能声明公网页面验收完成。真实验证码前端、邮件配置及收件验收仍待完成。

### 2026-11-17 验证码预览
Vision Hardware Staging RFQ 专用 managed widget 已创建，hostname 仅 visionhardware-web-staging.bruceng1875.workers.dev。Secret 与 HMAC 限流密钥已存入测试 Worker。MAIL_FROM、NOTIFICATION_TO、RESEND_API_KEY 均已配置。
前端支持 staging Turnstile，失败重试刷新 token，数据不写 localStorage。RFQ_PREVIEW=true 仅打开表单预览，接收/邮件/隐私批准开关仍 false。生产不会因 RFQ_PREVIEW 开启而启用表单。
预览版本 643d02a9-6c56-4fe8-8d1e-101f5c26b460，21 项现有测试通过。真实提交、实际收件、云端限流绑定与 Cron 尚未验收；当前不可宣称询盘系统上线完成。

### 2026-11-17 限流与恢复任务
新增测试专用 RATE_LIMITER namespace 2026111701，5 次/60 秒；Cron 每 5 分钟扫描 outbox，询盘关闭时任务直接返回。测试邮件只允许匹配 STAGING_NOTIFICATION_TO Secret 的收件人，并要求固定 Resend 测试发件人，主题带 [TEST]。邮箱白名单不写入源码。23 项测试通过。
workers.dev 测试地址 TCP 连接失败，真实 Turnstile 浏览器提交及邮件收件尚无法验收，因此 INQUIRIES_ENABLED、ALLOW_EMAIL_SEND 和 PRIVACY_APPROVED 继续 false。待用户/浏览器确认测试域名可访问再进行真实链路测试，不以绕过验证码代替验收。

### 邮件拒绝原因与修复
真实测试询盘已入库，但首次通知遭 Resend 403 validation_error 拒绝。诊断确认：收件地址首字母大写触发测试注册邮箱限制；改为全小写后，Resend 接受诊断邮件，provider id 01a1e9a7-601b-77d3-bd2f-3fd9a4c8ae9d。已将 NOTIFICATION_TO 与 STAGING_NOTIFICATION_TO Secret 统一为注册邮箱原样。原失败通知重新排队，等待 Cron 恢复；最终 Gmail 收件仍需确认。错误日志现在只存 HTTP 状态与提供商错误名称，不记录响应正文或密钥。

### 2026-11-17 收件确认
用户确认收到测试邮件。原询盘 0abe1fc9-71e2-44c8-bb37-44efa9b5736f 的通知经定时恢复已转 accepted，attempts=2，provider id 01a1e9aa-1a9d-7409-9867-03a44969ea24，accepted_at 2026-11-17T13:20:01.689Z。说明持久化及通知恢复链路已得到云端验证。另有修复前提交的测试询盘 decbb6e0-ef4f-4782-9e5f-edee96864b98，旧 MAIL_REJECTED 通知重新排队；未删除或重建询盘。生产仍未上线；企业真实资料、发件域名验证、正式隐私政策及生产审核待完成。
