# Crypto Price Viewer

VS Code 加密货币价格查看器插件，显示市值前 200 的加密货币实时价格信息。

## 功能

- 显示前 200 个加密货币的实时价格
- 包含币种图标、当前价格、24 小时涨跌幅和市值信息
- 自动每 30 秒更新一次数据
- 支持手动刷新价格数据

## 使用方法

1. 打开命令面板 (Ctrl+Shift+P / Cmd+Shift+P)
2. 输入以下命令之一：
   - `Crypto: Show Top 200 Prices` - 显示价格列表
   - `Crypto: Refresh Prices` - 手动刷新价格数据

## 数据来源

数据通过 CoinGecko API 获取，免费且无需 API key。

## 注意事项

- 价格数据每 30 秒自动更新一次
- 所有价格均以美元(USD)为单位显示
