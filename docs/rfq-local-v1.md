# Vision Hardware RFQ 本地 V1

2026-11-14。依据 D:/nex/nexkitra-git/inquiry-worker 的真实实现适配，不复制 NEXKITRA 邮箱、数据库 ID、密钥、域名绑定或客户资料。

## 已实现

- 原有 Worker 架构，新增 /api/rfq；8 个服装辅料分类，不增加虚构 SKU。
- 本地 RFQ 与 Contact 表单：字段验证、分类预选、隐私测试告知、提交中/失败/成功状态、保留输入、重复提交保护。数量当前按件填写，绳带长度需写入需求；后续真实目录接入时扩展单位。
- 参数化 SQL、原子保存询盘及通知任务、UUID 幂等与内容冲突检测；请求实际读取限制 32 KiB；未知字段、错误 Origin、无效 token、蜜罐拒绝。
- 邮件与询盘接收状态分离；持久化 outbox、租约、退避、重试上限、超过去重窗口转人工检查。提供 Resend 适配器，但本地强制模拟发送，未发送真实邮件。
- 从本地 SQLite 适配 D1 使用的方法；本地仅绑定 127.0.0.1，检查 Host 与 Origin。每 10 秒扫描测试通知队列，重启后可恢复。
- 无 JavaScript 时按钮禁用；不将个人信息放到 localStorage；无附件、无公开询盘查询接口。

## 本地运行

Node.js 24：`node scripts/preview.mjs`，访问 http://127.0.0.1:8787/request-quote/。
`node --test tests/*.test.mjs` 执行测试。无 npm 安装要求。

使用虚构资料；SQLite 数据位于 `.local/inquiries.sqlite`，已加入 gitignore。若需测试邮件失败，启动前设置 PowerShell `$env:MOCK_MAIL_FAIL='true'`；正常模式删除此环境变量后重启。测试记录不会自动清理，也不将真实询盘写入此本地演示。

## 生产及云端边界

wrangler.toml 未改，未推送、创建云资源或部署。非本地页面保持旧的禁用表单；服务端缺省关闭。云端不能使用 mock 校验或模拟限流替代正式防护。
真实启用仍需：独立测试 D1 与迁移、限流绑定、Turnstile Widget/服务端密钥、确认的邮件服务及已验证发件域、收件箱、隐私条款及版本、Cron、备份与恢复/删除流程、告警负责人。随后接入真实前端 Turnstile 与云端表单开关并完成端到端验收。现阶段隐私页仅是本地测试告知，不能当正式隐私政策。
邮件适配器接受不等于最终收件；需人工检查测试邮件抵达及垃圾箱，之后才申请用户批准生产切换。

## 核验来源

- Cloudflare Turnstile 服务端验证：https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- Resend 去重键窗口：https://resend.com/docs/dashboard/emails/idempotency-keys

这两个接口的当前官方说明已核对。云端资源、平台限流、真实邮件、真实验证码、手机性能评分尚未验证；SQLite 适配测试不等同于 D1 云端测试。
