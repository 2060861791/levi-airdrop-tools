const fs = require('fs');
const path = require('path');

/**
 * 对地址进行马赛克处理
 */
function maskAddress(address, prefixLength = 6, suffixLength = 6) {
  if (!address || address.trim().length === 0) {
    return address;
  }

  const trimmed = address.trim();
  const totalLength = trimmed.length;

  if (totalLength <= prefixLength + suffixLength) {
    const actualPrefix = Math.min(2, Math.floor(totalLength / 2));
    const actualSuffix = Math.min(2, totalLength - actualPrefix);
    const masked = '*'.repeat(totalLength - actualPrefix - actualSuffix);
    return trimmed.substring(0, actualPrefix) + masked + trimmed.substring(totalLength - actualSuffix);
  }

  const prefix = trimmed.substring(0, prefixLength);
  const suffix = trimmed.substring(totalLength - suffixLength);
  const maskedLength = totalLength - prefixLength - suffixLength;
  const masked = '*'.repeat(maskedLength);

  return prefix + masked + suffix;
}

/**
 * 处理CSV文件中的敏感数据
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

    // 处理每一行
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        processedLines.push('');
        continue;
      }

      // 解析CSV行（处理引号）
      const values = parseCSVLine(line);
      const processedValues = [];

      for (let j = 0; j < values.length; j++) {
        let value = values[j].trim();
        
        // 移除引号
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }

        // 表头行保持不变
        if (i === 0) {
          processedValues.push(`"${value}"`);
          continue;
        }

        // 根据列索引判断需要处理的字段
        // 列顺序：X用户名,X密码,X-2FA,TG电话,TG密码,DC邮箱,DC密码,DC-2FA
        if (j === 0) {
          // X用户名：保留前2个和后2个字符
          if (value.length > 4) {
            const masked = maskAddress(value, 2, 2);
            processedValues.push(`"${masked}"`);
            if (masked !== value) hasChanges = true;
          } else {
            processedValues.push(`"${value}"`);
          }
        } else if (j === 1 || j === 4 || j === 6) {
          // X密码、TG密码、DC密码：全部马赛克
          const masked = '*'.repeat(Math.max(8, value.length));
          processedValues.push(`"${masked}"`);
          if (masked !== value) hasChanges = true;
        } else if (j === 2 || j === 7) {
          // X-2FA、DC-2FA：保留前4个和后4个字符
          if (value.length > 8) {
            const masked = maskAddress(value, 4, 4);
            processedValues.push(`"${masked}"`);
            if (masked !== value) hasChanges = true;
          } else {
            processedValues.push(`"${value}"`);
          }
        } else if (j === 3) {
          // TG电话：保留前3个和后4个字符（+1XXXXXXXXXX）
          if (value.length > 7) {
            const masked = maskAddress(value, 3, 4);
            processedValues.push(`"${masked}"`);
            if (masked !== value) hasChanges = true;
          } else {
            processedValues.push(`"${value}"`);
          }
        } else if (j === 5) {
          // DC邮箱：保留@前2个字符和@后域名
          const atIndex = value.indexOf('@');
          if (atIndex > 0) {
            const localPart = value.substring(0, atIndex);
            const domain = value.substring(atIndex);
            const maskedLocal = localPart.length > 2 
              ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
              : localPart;
            processedValues.push(`"${maskedLocal}${domain}"`);
            if (maskedLocal !== localPart) hasChanges = true;
          } else {
            processedValues.push(`"${value}"`);
          }
        } else {
          processedValues.push(`"${value}"`);
        }
      }

      processedLines.push(processedValues.join(','));
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, processedLines.join('\n'), 'utf-8');
      console.log(`✅ 已处理: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  无需处理: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 处理失败: ${filePath} - ${error.message}`);
    return false;
  }
}

/**
 * 解析CSV行（处理引号内的逗号）
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始马赛克处理敏感数据...\n');

  const baseDir = __dirname;
  const dataFile = path.join(baseDir, 'data', '三件套合并数据.csv');

  if (fs.existsSync(dataFile)) {
    console.log(`📁 处理文件: ${dataFile}`);
    processCSVFile(dataFile);
  } else {
    console.log(`⚠️  文件不存在: ${dataFile}`);
  }

  console.log('\n✅ 处理完成！');
  console.log('⚠️  注意：原文件已被修改，请确保已备份！');
}

if (require.main === module) {
  main();
}

module.exports = { processCSVFile, maskAddress };

