# Vision Hardware 第二阶段开发计划

核查日期：2026-11-14（Asia/Shanghai）。基线：main `0d2cb5d8e09402f4e0a4a957b510c117a5febf72`。
工作分支：`codex/phase2-audit`。本轮只增加本地预览工具和文档，不调整页面、Logo 或生产配置。

## 已核实的源码与线上现状

- README：明确是设计预览；记录 main → Cloudflare Builds 自动部署。尚未读取 Cloudflare 控制台，无法独立确认当前构建设置或历史。
- src/index.js：单个 Worker 返回完整 HTML，CSS 和 SVG 内嵌；蓝白配色、连体 Logo 路径保留。14 个内容页面，包括 8 个分类页；没有 SKU、商品详情模型、数据库或后台。
- 产品图均由 pic() 生成，分类内容明确待确认。公司名称与所在地是现存文案，不能视为本次已核实的企业资料。
- 表单是带禁用控件的 div，没有提交功能；所有非 GET/HEAD 请求返回 405。无服务端验证、反垃圾、邮件、隐私页面。
- wrangler.toml：Worker 名 visionhardware-web，入口 src/index.js，compatibility_date 2026-11-01，workers_dev=true，正式自定义域名 visionhardware.net。
- package.json：Wrangler ^4.0.0，原本只有 deploy 脚本；没有 lockfile、测试或本地开发脚本。
- 正式首页 GET 返回 200，内容与本地 main Worker 生成的 HTML 逐字一致，SHA-256 为 c9efce8a041e5fcae9c2276612b3bc1b649d5864cbb6a8a16c3e3f202712a7ef。仅凭首页不能证明所有线上配置一致。
- 本地 14 个内容页面全部 200；robots.txt、sitemap.xml、privacy 和未知路径均 404；HEAD 无正文；本地 POST RFQ 返回 405。没有向生产提交询盘。
- 全站 noindex,nofollow；页面 description 共用，缺少 canonical、sitemap、robots 路由、分享元数据及产品结构化数据。
- 已有 1050/820/520px 响应式样式；菜单缺 aria-expanded/aria-controls。真实浏览器移动端、键盘、性能尚待测，不能把存在断点当成测试通过。
- 首页 HTML 31,070 字节（未压缩）；无外部产品照片，不能据此估算接入真实素材后的性能。

## 实施顺序与验收

### 1. 开发与预览隔离

保留当前 Worker 架构，不引入新的站点平台。先用 node scripts/preview.mjs 本地预览。补齐 npm 后安装并锁定经过验证的 Wrangler 版本；检查依赖安装脚本及依赖安全状况。
远程预览使用单独配置文件和 Worker 名 visionhardware-web-staging，不带生产 routes；独立测试密钥和测试收件箱，禁用索引。核实 Cloudflare 分支部署规则后再推送分支，避免误触生产。
验收：现有页面与 Logo 对照一致；预览不绑定正式域名；生产配置保持原样。

### 2. 产品目录与真实素材

先将 8 个分类从位置数组转换为具名对象，保持现有 URL。建立独立产品数据文件和校验器，初始产品列表为空，不制造示例 SKU 充当真货。

建议字段：id、slug、categoryId、name、status(draft/approved/published)、summary、images、variants、seo、sourceReference、approvedAt。
variants 含真实 sku、material、finish、dimensions（值与单位分开）、color、moq、leadTime；未知字段为空或省略，不以 0 或行业常见值代填。images 含路径、alt、width、height、是否经客户确认；认证仅在收到证书和授权后添加。
素材按真实 SKU 关联，保留原图与来源，生成 WebP/AVIF 和尺寸变体；首屏主图优先加载，其余延迟加载，固定尺寸减少跳动。保留已确认的蓝白视觉，示意图继续清楚标注。
验收：先导入 3–5 个客户确认的真实产品；唯一 SKU/slug、合法分类、图片与规格对应；草稿不进入公开目录或 sitemap；详情页将 SKU 带入 RFQ。

### 3. B2B RFQ（默认关闭）

使用独立 POST /api/rfq，启动开关缺省关闭；缺密钥/收件箱/隐私版本时失败关闭。前端只有完整配置且审批后才启用。
字段：姓名、企业邮箱、公司、国家/目的地、产品 SKU/分类、数量与单位、需求、可选 WhatsApp、隐私告知确认。第一版不接收附件，避免未经设计的文件存储与扫描路径。
服务端限制请求大小、类型、字段长度、数量格式及枚举；拒绝未知 SKU；邮件内容转义，阻止邮件头注入。加入同源校验、蜜罐、服务端验证 Turnstile、共享存储限流、幂等键防重复。不能仅依靠前端验证或 Worker 实例内存限流。
邮件使用已验证发件域名及确认的企业收件箱；访客邮箱只作 Reply-To。先使用测试邮件适配器。需要持久化投递状态/重试策略：失败不能显示“发送成功”，成功回执说明是已接收还是已投递。日志避免记录需求全文和联系方式。
隐私页明确收集目的、处理方、邮件/存储服务、保留期限、删除联系方式；具体主体与期限由企业确认，营销同意与询盘处理分开。
验收：正常请求、无效邮箱、超长请求、恶意内容、机器人 token 无效/过期、频率限制、重复提交、邮件故障、关闭开关均有测试；测试邮箱端到端验证后才申请正式启用。

### 4. SEO 与上线准备

逐页 title/description、canonical、真实内容的分享图；统一尾斜杠策略；正确 404/405 与 Allow 响应头。sitemap 只包含审核通过且准备索引的页面。robots 按环境生成；预览始终 noindex，不能把 robots 当访问控制，也不要用禁止抓取掩盖需要爬虫读取的 noindex。
只有内容、联系方式、隐私和询盘全部验收后，再由用户确认生产开放索引。届时配置 Search Console 和提交 sitemap。不得编造价格、库存、评分、认证或组织结构化数据。

### 5. 移动端、可访问性与性能

浏览器测试 320/375/390/768/1280/1440px，覆盖首页、目录、长标题详情、RFQ、404；检查横向溢出、菜单、焦点、键盘、表单错误与成功状态。菜单补 aria-expanded/aria-controls；尊重减少动画偏好。
接入真实图片后测 Lighthouse/移动网络，检查 LCP、CLS、INP（INP 需交互或现场数据）、图片尺寸和缓存；以 LCP≤2.5s、CLS≤0.1、INP≤200ms 为目标，不在没有数据时承诺通过。
所有功能测试在本地/预览执行；发布前确认 diff、回滚提交、域名配置、测试收件箱与正式收件箱切换，再请求用户批准合并 main。

## 待客户提供

真实产品表（SKU、分类、名称、已确认规格/MOQ/交期）、原始图片及对应关系；确认的公司资料；企业收件邮箱和可选 WhatsApp；发件域名权限与邮件服务选择；隐私主体、数据保留期限和删除联系渠道。缺失材料不阻碍先开发空数据结构和测试适配器，但阻碍真实商品发布及询盘启用。
