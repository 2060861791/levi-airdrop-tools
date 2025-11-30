const fs = require('fs');
const path = require('path');

/**
 * 对地址进行马赛克处理
 * 保留前几个字符和后几个字符，中间用*替代
 */
function maskAddress(address, prefixLength = 6, suffixLength = 6) {
  if (!address || address.trim().length === 0) {
    return address;
  }

  const trimmed = address.trim();
  const totalLength = trimmed.length;

  // 如果地址太短，只保留前后各2个字符
  if (totalLength <= prefixLength + suffixLength) {
    const actualPrefix = Math.min(2, Math.floor(totalLength / 2));
    const actualSuffix = Math.min(2, totalLength - actualPrefix);
    const masked = '*'.repeat(totalLength - actualPrefix - actualSuffix);
    return trimmed.substring(0, actualPrefix) + masked + trimmed.substring(totalLength - actualSuffix);
  }

  // 正常情况：保留前后字符，中间用*替代
  const prefix = trimmed.substring(0, prefixLength);
  const suffix = trimmed.substring(totalLength - suffixLength);
  const maskedLength = totalLength - prefixLength - suffixLength;
  const masked = '*'.repeat(maskedLength);

  return prefix + masked + suffix;
}

/**
 * 判断是否为地址字段（需要马赛克处理）
 */
function isAddressField(value) {
  if (!value || value.trim().length === 0) {
    return false;
  }

  const trimmed = value.trim();

  // Bitcoin地址
  if (trimmed.startsWith('bc1') || trimmed.startsWith('tb1')) {
    return true;
  }

  // 0x开头的地址（EVM/APT/SUI等）
  if (trimmed.startsWith('0x') && trimmed.length >= 20) {
    return true;
  }

  // Solana地址（Base58，通常较长，包含大小写字母和数字）
  if (trimmed.length > 30 && /^[A-Za-z0-9]+$/.test(trimmed) && !trimmed.startsWith('0x')) {
    return true;
  }

  // NEAR地址（纯十六进制，无0x前缀，通常64字符）
  if (/^[a-fA-F0-9]+$/.test(trimmed) && trimmed.length >= 40 && !trimmed.startsWith('0x')) {
    return true;
  }

  // 其他可能的地址格式
  if (trimmed.length >= 20 && /^[a-zA-Z0-9:]+$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * 根据地址类型决定保留的字符数
 */
function getMaskParams(address) {
  const trimmed = address.trim();

  // Bitcoin地址
  if (trimmed.startsWith('bc1') || trimmed.startsWith('tb1')) {
    return { prefixLen: 8, suffixLen: 8 };
  }

  // 0x开头的地址
  if (trimmed.startsWith('0x')) {
    return { prefixLen: 6, suffixLen: 6 }; // 0x + 4个字符
  }

  // Solana地址（Base58长字符串）
  if (trimmed.length > 30 && /^[A-Za-z0-9]+$/.test(trimmed)) {
    return { prefixLen: 8, suffixLen: 8 };
  }

  // NEAR地址（纯十六进制）
  if (/^[a-fA-F0-9]+$/.test(trimmed) && trimmed.length >= 40) {
    return { prefixLen: 6, suffixLen: 6 };
  }

  // 默认
  return { prefixLen: 6, suffixLen: 6 };
}

/**
 * 处理CSV文件
 */
function processCSVFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    if (lines.length === 0) {
      console.log(`⚠️  跳过空文件: ${filePath}`);
      return false;
    }

    const processedLines = [];
    let hasChanges = false;

    // 判断是否为ETH地址数据格式（第一列是Address）
    const firstLine = lines[0].trim();
    const isETHAddressFormat = firstLine.toLowerCase().includes('address') && 
                                firstLine.toLowerCase().includes('addressname');

    // 处理每一行
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        processedLines.push('');
        continue;
      }

      // 解析CSV行（简单处理，假设没有引号内的逗号）
      const values = line.split(',');

      // 处理每个值
      const processedValues = [];
      for (let j = 0; j < values.length; j++) {
        const value = values[j].trim();

        // 表头行保持不变
        if (i === 0) {
          processedValues.push(value);
          continue;
        }

        // ETH地址数据格式：第一列是Address（需要处理），第二列是AddressName（不处理）
        if (isETHAddressFormat) {
          if (j === 0) {
            // 第一列是Address，需要处理
            if (isAddressField(value)) {
              const { prefixLen, suffixLen } = getMaskParams(value);
              const masked = maskAddress(value, prefixLen, suffixLen);
              processedValues.push(masked);
              if (masked !== value) {
                hasChanges = true;
              }
            } else {
              processedValues.push(value);
            }
          } else {
            // 其他列（如AddressName）保持不变
            processedValues.push(value);
          }
        } else {
          // 普通CSV格式：第一列是账户名（不处理），其他列如果是地址则处理
          if (j === 0) {
            // 第一列通常是账户名，保持不变
            processedValues.push(value);
          } else {
            // 其他列判断是否为地址
            if (isAddressField(value)) {
              const { prefixLen, suffixLen } = getMaskParams(value);
              const masked = maskAddress(value, prefixLen, suffixLen);
              processedValues.push(masked);
              if (masked !== value) {
                hasChanges = true;
              }
            } else {
              processedValues.push(value);
            }
          }
        }
      }

      processedLines.push(processedValues.join(','));
    }

    // 如果有变化，写回文件
    if (hasChanges) {
      fs.writeFileSync(filePath, processedLines.join('\n'), 'utf-8');
      console.log(`✅ 已处理: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  无需处理: ${filePath} (未找到地址数据)`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 处理失败: ${filePath} - ${error.message}`);
    return false;
  }
}

/**
 * 递归处理目录中的所有CSV文件
 */
function processDirectory(dirPath) {
  let processedCount = 0;
  let errorCount = 0;

  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // 递归处理子目录
        const result = processDirectory(filePath);
        processedCount += result.processedCount;
        errorCount += result.errorCount;
      } else if (stat.isFile() && file.endsWith('.csv')) {
        // 处理CSV文件
        const success = processCSVFile(filePath);
        if (success) {
          processedCount++;
        } else if (filePath.includes('处理失败')) {
          errorCount++;
        }
      }
    }
  } catch (error) {
    console.error(`❌ 处理目录失败: ${dirPath} - ${error.message}`);
    errorCount++;
  }

  return { processedCount, errorCount };
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始马赛克处理敏感数据...\n');

  const baseDir = __dirname;
  const directories = [
    '原始数据',
    '清洗后数据',
    '去除ETH地址数据',
    'ETH地址数据'
  ];

  let totalProcessed = 0;
  let totalErrors = 0;

  for (const dirName of directories) {
    const dirPath = path.join(baseDir, dirName);

    if (fs.existsSync(dirPath)) {
      console.log(`📁 处理目录: ${dirName}/`);
      const result = processDirectory(dirPath);
      totalProcessed += result.processedCount;
      totalErrors += result.errorCount;
      console.log('');
    } else {
      console.log(`⚠️  目录不存在: ${dirPath}\n`);
    }
  }

  console.log('📊 处理总结:');
  console.log(`✅ 成功处理: ${totalProcessed} 个文件`);
  if (totalErrors > 0) {
    console.log(`❌ 处理失败: ${totalErrors} 个文件`);
  }
  console.log('\n⚠️  注意：原文件已被修改，请确保已备份！');
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = {
  maskAddress,
  isAddressField,
  getMaskParams,
  processCSVFile,
  processDirectory
};

