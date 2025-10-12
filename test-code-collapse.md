---
title: 测试代码块折叠功能
published: 2025-10-12
description: 测试长代码块自动折叠
tags: [测试]
category: 测试
draft: false
---

# 测试代码块折叠

## 短代码块（不会折叠）

```javascript
function hello() {
  console.log("Hello World");
  return true;
}
```

## 长代码块（应该自动折叠，超过20行）

```javascript
// 这是一个超过20行的代码块，应该会自动折叠
function complexFunction() {
  const data = {
    name: "Test",
    value: 123,
    items: []
  };
  
  for (let i = 0; i < 10; i++) {
    data.items.push({
      id: i,
      name: `Item ${i}`,
      active: true
    });
  }
  
  const processData = (item) => {
    return {
      ...item,
      processed: true,
      timestamp: Date.now()
    };
  };
  
  const results = data.items
    .filter(item => item.active)
    .map(processData)
    .reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  
  return {
    original: data,
    processed: results,
    count: Object.keys(results).length
  };
}

// 调用函数
const result = complexFunction();
console.log(result);
```

## 另一个长代码块

```python
# Python 示例 - 超过20行
class DataProcessor:
    def __init__(self, data):
        self.data = data
        self.results = []
    
    def process(self):
        for item in self.data:
            processed = self._transform(item)
            self.results.append(processed)
        return self.results
    
    def _transform(self, item):
        return {
            'id': item.get('id'),
            'value': item.get('value', 0) * 2,
            'status': 'processed'
        }
    
    def filter_results(self, condition):
        return [r for r in self.results if condition(r)]
    
    def get_summary(self):
        return {
            'total': len(self.results),
            'sum': sum(r['value'] for r in self.results),
            'avg': sum(r['value'] for r in self.results) / len(self.results)
        }

# 使用示例
data = [{'id': i, 'value': i * 10} for i in range(5)]
processor = DataProcessor(data)
results = processor.process()
summary = processor.get_summary()
print(summary)