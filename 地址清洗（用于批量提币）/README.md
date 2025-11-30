# 空投地址数据清洗工具

这个工具用于清洗CSV格式的区块链地址数据，只保留指定的链，并按照空投编号规则重命名账户。

## 功能特点

- ✅ **数据清洗**: 只保留 Bitcoin、Ethereum、SUI、Aptos、NEAR、Solana 6个链
- ✅ **智能重命名**: 按照空投编号规则重命名账户
- ✅ **批量处理**: 支持处理多个助记词文件
- ✅ **编号规则**: 空投编号 = 账户编号 × 10 - (10 - 助记词编号)

## 空投编号规则

| 助记词编号 | 账户编号 | 空投地址编号 |
| ---------- | -------- | ------------ |
| 1          | 1        | 空投1        |
| 1          | 2        | 空投11       |
| 1          | 3        | 空投21       |
| ...        | ...      | ...          |
| 2          | 1        | 空投2        |
| 2          | 2        | 空投12       |
| 2          | 3        | 空投22       |
| ...        | ...      | ...          |
| 10         | 10       | 空投100      |

### 计算公式
```
空投编号 = 账户编号 × 10 - (10 - 助记词编号)
```

## 使用方法

### 1. 单个文件处理
```bash
# 处理助记词1.csv
node data-cleaner.js
```

### 2. 批量处理
```bash
# 处理所有助记词文件 (助记词1.csv 到 助记词10.csv)
node batch-cleaner.js
```

### 3. 处理单个助记词文件
```bash
# 处理助记词2.csv
node batch-cleaner.js --single 2
```

### 4. 查看帮助
```bash
node batch-cleaner.js --help
```

## 输入文件格式

CSV文件应包含以下列：
- 第一列：账户名称 (如 "账户 01", "账户 02")
- 其他列：各链的地址

示例：
```csv
助记词1,Abstract,Endurance,ApeChain,Aptos,Arbitrum One,Bitcoin,Ethereum,SUI,NEAR,Solana
账户 01,0xda711c4cada8aae7bddfa7640e0fd0ce6f6f740a,...,bc1plwlpqkf459jcpe8dhd0p7ml4xsldakwdp4dwm4qlx9yeprm9cgjqx988jq,0xda711c4cada8aae7bddfa7640e0fd0ce6f6f740a,0xce5c3f00db1415b7f85391894153bd719ef700d68df9a33916c5cb4857ba65ec,2a283912fb10acdcbaa9b33a2e1f1f7d1f2c7d9cfae61682c3c50d33ca377ab6,4pKVpyfYfjwtig6obhdVnnZpM3RRkRQtiXWMYhPTQdqs
```

## 输出文件格式

清洗后的CSV文件只包含指定的6个链：

```csv
账户,Bitcoin,Ethereum,SUI,Aptos,NEAR,Solana
空投1,bc1plwlpqkf459jcpe8dhd0p7ml4xsldakwdp4dwm4qlx9yeprm9cgjqx988jq,0xda711c4cada8aae7bddfa7640e0fd0ce6f6f740a,0xce5c3f00db1415b7f85391894153bd719ef700d68df9a33916c5cb4857ba65ec,0x88a5b568ee9fca9afa774b1cee596b6e0008c7b97533c83d3b322dcb7d87781c,2a283912fb10acdcbaa9b33a2e1f1f7d1f2c7d9cfae61682c3c50d33ca377ab6,4pKVpyfYfjwtig6obhdVnnZpM3RRkRQtiXWMYhPTQdqs
空投11,bc1pjr8zp2yhkhzfegh3s8var7dr27j9zttmaae4t7lrqrekn9djwgfsyt68xe,0x2d1423da7d58aa91d2f99a34cb870147ce6df0d8,0xb2c14d6d93ca2516d1189a8d24e075311d58c4de611cbaa1688d643dfee4e8c0,0xe999d237fe51984175ffbb874587a0534ca9850b504783d7f3716b07b2b46a51,63b108d055e97710e50c170ae4b746e87eeb4a93de5455cd5a258eb237ae8a6a,8KibTdaA8c1r9MxC865Cct3WU5ku85cdv3NGgrkay1ka
```

## 文件说明

- `data-cleaner.js` - 单个文件处理脚本
- `batch-cleaner.js` - 批量处理脚本
- `助记词1.csv` - 输入文件示例
- `清洗后_助记词1.csv` - 输出文件示例

## 环境要求

- Node.js 14+
- 无需额外依赖包

## 注意事项

1. **文件命名**: 输入文件必须命名为 `助记词1.csv`, `助记词2.csv` 等格式
2. **数据完整性**: 确保CSV文件包含所有需要的链列
3. **编码格式**: 文件使用UTF-8编码
4. **备份**: 建议在处理前备份原始文件

## 错误处理

- 如果找不到指定的链列，该列将留空
- 如果无法解析账户名称，该行将被跳过
- 如果输入文件不存在，脚本会显示错误信息

## 示例输出

```
🚀 开始数据清洗...
📋 配置信息:
   助记词编号: 1
   保留的链: Bitcoin, Ethereum, SUI, Aptos, NEAR, Solana

✅ 找到的链索引: {
  Bitcoin: 14,
  Ethereum: 69,
  SUI: 113,
  Aptos: 4,
  NEAR: 81,
  Solana: 104
}
✅ 数据清洗完成！
📁 输入文件: 助记词1.csv
📁 输出文件: 清洗后_助记词1.csv
📊 处理了 10 个账户
🔗 保留了 6 个链

📋 编号映射示例:
  账户 01 → 空投1
  账户 02 → 空投11
  账户 03 → 空投21
  账户 04 → 空投31
  账户 05 → 空投41
``` 