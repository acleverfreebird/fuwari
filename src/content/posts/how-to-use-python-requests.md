---
title: 'Python Requests库完全指南'
author: 'freebird2913'
published: 2025-10-19T01:12:00.000Z
description: 'Python Requests库完全指南2025：从基础到高级的HTTP请求教程，详细讲解GET/POST请求方法、参数传递、身份认证机制、Session会话管理、Cookies处理、文件上传下载、超时重试策略、代理服务器配置、SSL证书验证等完整内容，配合GitHub API、网页爬虫等实战案例帮助掌握网络编程技能。'
image: ''
tags: ['Python', 'Requests', 'HTTP', 'API', 'Web爬虫']
category: 'Python教程'
draft: false
lang: 'zh-CN'
excerpt: '本文将全面介绍Python Requests库的使用方法，包括安装、基本请求、高级功能、会话管理、错误处理等内容，帮助你掌握HTTP请求的最佳实践。'
keywords: ['Python', 'Requests', 'HTTP请求', 'API调用', 'Web爬虫']
readingTime: 20
series: 'Python实用库'
seriesOrder: 1
---

## 1. Requests库简介

[`requests`](https://requests.readthedocs.io/) 是Python中最流行的HTTP库，它让HTTP请求变得简单而优雅。相比于Python标准库中的 [`urllib`](urllib)，Requests提供了更加人性化的API，是进行Web开发、API调用和网络爬虫的首选工具。

### 1.1. 为什么选择Requests？

- **简洁优雅**：API设计直观，代码可读性强
- **功能强大**：支持所有HTTP方法和高级特性
- **自动处理**：自动处理编码、重定向、cookies等
- **广泛使用**：社区活跃，文档完善

## 2. 安装Requests

使用pip安装Requests非常简单：

```bash
pip install requests
```

验证安装：

```python
import requests
print(requests.__version__)
```

## 3. 基本HTTP请求

### 3.1. GET请求

GET请求是最常用的HTTP方法，用于获取资源：

```python
import requests

# 基本GET请求
response = requests.get('https://api.github.com')
print(response.status_code)  # 状态码
print(response.text)  # 响应内容（字符串）
```

### 3.2. 带参数的GET请求

使用 `params` 参数传递查询字符串：

```python
# 方式1：使用字典
params = {'key1': 'value1', 'key2': 'value2'}
response = requests.get('https://httpbin.org/get', params=params)

# 方式2：使用列表（支持重复键）
params = [('key', 'value1'), ('key', 'value2')]
response = requests.get('https://httpbin.org/get', params=params)

print(response.url)  # 查看完整URL
```

### 3.3. POST请求

POST请求用于提交数据：

```python
# 发送表单数据
data = {'username': 'user', 'password': 'pass'}
response = requests.post('https://httpbin.org/post', data=data)

# 发送JSON数据
json_data = {'name': 'John', 'age': 30}
response = requests.post('https://httpbin.org/post', json=json_data)
```

### 3.4. 其他HTTP方法

Requests支持所有标准HTTP方法：

```python
# PUT请求
response = requests.put('https://httpbin.org/put', data={'key': 'value'})

# DELETE请求
response = requests.delete('https://httpbin.org/delete')

# HEAD请求（只获取响应头）
response = requests.head('https://httpbin.org/get')

# OPTIONS请求
response = requests.options('https://httpbin.org/get')

# PATCH请求
response = requests.patch('https://httpbin.org/patch', data={'key': 'value'})
```

## 4. 处理响应

### 4.1. 响应内容

[`Response`](requests.Response) 对象提供了多种方式访问响应内容：

```python
response = requests.get('https://api.github.com')

# 文本内容（自动解码）
print(response.text)

# 二进制内容
print(response.content)

# JSON内容（自动解析）
data = response.json()

# 原始响应（需要设置stream=True）
response = requests.get('https://api.github.com', stream=True)
print(response.raw.read(10))
```

### 4.2. 响应状态

```python
response = requests.get('https://api.github.com')

# 状态码
print(response.status_code)

# 检查请求是否成功
if response.status_code == 200:
    print('请求成功')

# 使用内置状态码常量
if response.status_code == requests.codes.ok:
    print('请求成功')

# 自动抛出异常（如果状态码表示错误）
response.raise_for_status()
```

### 4.3. 响应头

```python
response = requests.get('https://api.github.com')

# 访问响应头（字典形式）
print(response.headers)
print(response.headers['Content-Type'])
print(response.headers.get('content-type'))

# 响应头不区分大小写
print(response.headers['content-type'])
print(response.headers['Content-Type'])
```

## 5. 请求头和认证

### 5.1. 自定义请求头

```python
headers = {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json',
    'Authorization': 'Bearer token123'
}

response = requests.get('https://api.github.com', headers=headers)
```

### 5.2. HTTP基本认证

```python
from requests.auth import HTTPBasicAuth

# 方式1：使用auth参数
response = requests.get(
    'https://api.github.com/user',
    auth=HTTPBasicAuth('username', 'password')
)

# 方式2：简写形式
response = requests.get(
    'https://api.github.com/user',
    auth=('username', 'password')
)
```

### 5.3. Token认证

```python
# Bearer Token
headers = {'Authorization': 'Bearer YOUR_TOKEN'}
response = requests.get('https://api.example.com/data', headers=headers)

# API Key
params = {'api_key': 'YOUR_API_KEY'}
response = requests.get('https://api.example.com/data', params=params)
```

## 6. 会话管理

使用 [`Session`](requests.Session) 对象可以在多个请求之间保持某些参数：

```python
# 创建会话
session = requests.Session()

# 设置会话级别的请求头
session.headers.update({'User-Agent': 'My App'})

# 会话会自动处理cookies
session.get('https://httpbin.org/cookies/set/sessioncookie/123')
response = session.get('https://httpbin.org/cookies')
print(response.json())

# 会话级别的认证
session.auth = ('username', 'password')

# 使用会话发送请求
response = session.get('https://api.github.com')

# 关闭会话
session.close()

# 使用上下文管理器（推荐）
with requests.Session() as session:
    session.get('https://httpbin.org/get')
```

## 7. Cookies处理

### 7.1. 发送Cookies

```python
# 方式1：使用字典
cookies = {'session_id': '123456'}
response = requests.get('https://httpbin.org/cookies', cookies=cookies)

# 方式2：使用RequestsCookieJar
from requests.cookies import RequestsCookieJar

jar = RequestsCookieJar()
jar.set('cookie_name', 'cookie_value', domain='httpbin.org', path='/cookies')
response = requests.get('https://httpbin.org/cookies', cookies=jar)
```

### 7.2. 获取Cookies

```python
response = requests.get('https://httpbin.org/cookies/set/name/value')

# 访问cookies
print(response.cookies)
print(response.cookies['name'])

# 遍历cookies
for cookie in response.cookies:
    print(f'{cookie.name}: {cookie.value}')
```

## 8. 文件上传和下载

### 8.1. 上传文件

```python
# 上传单个文件
files = {'file': open('report.txt', 'rb')}
response = requests.post('https://httpbin.org/post', files=files)

# 指定文件名和内容类型
files = {
    'file': ('report.pdf', open('report.pdf', 'rb'), 'application/pdf')
}
response = requests.post('https://httpbin.org/post', files=files)

# 上传多个文件
files = {
    'file1': open('file1.txt', 'rb'),
    'file2': open('file2.txt', 'rb')
}
response = requests.post('https://httpbin.org/post', files=files)

# 同时发送表单数据
files = {'file': open('report.txt', 'rb')}
data = {'description': 'My report'}
response = requests.post('https://httpbin.org/post', files=files, data=data)
```

### 8.2. 下载文件

```python
# 小文件下载
response = requests.get('https://example.com/file.pdf')
with open('downloaded_file.pdf', 'wb') as f:
    f.write(response.content)

# 大文件流式下载（节省内存）
response = requests.get('https://example.com/large_file.zip', stream=True)
with open('large_file.zip', 'wb') as f:
    for chunk in response.iter_content(chunk_size=8192):
        f.write(chunk)

# 带进度的下载
import os
response = requests.get('https://example.com/file.zip', stream=True)
total_size = int(response.headers.get('content-length', 0))
downloaded = 0

with open('file.zip', 'wb') as f:
    for chunk in response.iter_content(chunk_size=8192):
        downloaded += len(chunk)
        f.write(chunk)
        progress = (downloaded / total_size) * 100
        print(f'下载进度: {progress:.2f}%')
```

## 9. 超时和重试

### 9.1. 设置超时

```python
# 连接超时和读取超时（秒）
response = requests.get('https://api.github.com', timeout=5)

# 分别设置连接超时和读取超时
response = requests.get('https://api.github.com', timeout=(3, 10))

# 永久等待（不推荐）
response = requests.get('https://api.github.com', timeout=None)
```

### 9.2. 重试机制

```python
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

# 配置重试策略
retry_strategy = Retry(
    total=3,  # 总重试次数
    backoff_factor=1,  # 重试间隔时间因子
    status_forcelist=[429, 500, 502, 503, 504],  # 需要重试的状态码
    allowed_methods=["HEAD", "GET", "OPTIONS"]  # 允许重试的方法
)

adapter = HTTPAdapter(max_retries=retry_strategy)
session = requests.Session()
session.mount("http://", adapter)
session.mount("https://", adapter)

response = session.get('https://api.github.com')
```

## 10. 代理设置

```python
# HTTP代理
proxies = {
    'http': 'http://10.10.1.10:3128',
    'https': 'http://10.10.1.10:1080',
}
response = requests.get('https://httpbin.org/ip', proxies=proxies)

# SOCKS代理（需要安装requests[socks]）
proxies = {
    'http': 'socks5://user:pass@host:port',
    'https': 'socks5://user:pass@host:port'
}
response = requests.get('https://httpbin.org/ip', proxies=proxies)

# 环境变量代理
# 设置环境变量 HTTP_PROXY 和 HTTPS_PROXY
import os
os.environ['HTTP_PROXY'] = 'http://10.10.1.10:3128'
os.environ['HTTPS_PROXY'] = 'http://10.10.1.10:1080'
response = requests.get('https://httpbin.org/ip')
```

## 11. SSL证书验证

```python
# 默认验证SSL证书
response = requests.get('https://api.github.com')

# 禁用SSL证书验证（不推荐）
response = requests.get('https://example.com', verify=False)

# 使用自定义CA证书
response = requests.get('https://example.com', verify='/path/to/certfile')

# 客户端证书
response = requests.get(
    'https://example.com',
    cert=('/path/to/client.cert', '/path/to/client.key')
)
```

## 12. 错误处理

```python
import requests
from requests.exceptions import (
    RequestException,
    HTTPError,
    ConnectionError,
    Timeout,
    TooManyRedirects
)

try:
    response = requests.get('https://api.github.com', timeout=5)
    response.raise_for_status()  # 检查HTTP错误
    data = response.json()
    
except HTTPError as e:
    print(f'HTTP错误: {e}')
except ConnectionError as e:
    print(f'连接错误: {e}')
except Timeout as e:
    print(f'超时错误: {e}')
except TooManyRedirects as e:
    print(f'重定向过多: {e}')
except RequestException as e:
    print(f'请求异常: {e}')
except ValueError as e:
    print(f'JSON解析错误: {e}')
```

## 13. 实战示例

### 13.1. GitHub API调用

```python
import requests

def get_github_user(username):
    """获取GitHub用户信息"""
    url = f'https://api.github.com/users/{username}'
    headers = {'Accept': 'application/vnd.github.v3+json'}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f'请求失败: {e}')
        return None

# 使用示例
user_data = get_github_user('octocat')
if user_data:
    print(f"用户名: {user_data['login']}")
    print(f"仓库数: {user_data['public_repos']}")
```

### 13.2. 网页爬虫

```python
import requests
from bs4 import BeautifulSoup

def scrape_website(url):
    """简单的网页爬虫"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        response.encoding = response.apparent_encoding
        
        soup = BeautifulSoup(response.text, 'html.parser')
        title = soup.find('title').text
        
        return {
            'url': url,
            'title': title,
            'status_code': response.status_code
        }
    except Exception as e:
        print(f'爬取失败: {e}')
        return None
```

### 13.3. RESTful API客户端

```python
class APIClient:
    """RESTful API客户端封装"""
    
    def __init__(self, base_url, api_key=None):
        self.base_url = base_url
        self.session = requests.Session()
        
        if api_key:
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})
        
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    def get(self, endpoint, params=None):
        """GET请求"""
        url = f'{self.base_url}/{endpoint}'
        response = self.session.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    
    def post(self, endpoint, data=None):
        """POST请求"""
        url = f'{self.base_url}/{endpoint}'
        response = self.session.post(url, json=data, timeout=10)
        response.raise_for_status()
        return response.json()
    
    def put(self, endpoint, data=None):
        """PUT请求"""
        url = f'{self.base_url}/{endpoint}'
        response = self.session.put(url, json=data, timeout=10)
        response.raise_for_status()
        return response.json()
    
    def delete(self, endpoint):
        """DELETE请求"""
        url = f'{self.base_url}/{endpoint}'
        response = self.session.delete(url, timeout=10)
        response.raise_for_status()
        return response.status_code == 204

# 使用示例
client = APIClient('https://api.example.com', api_key='your_api_key')
users = client.get('users', params={'page': 1})
```

## 14. 最佳实践

### 14.1. 使用会话对象

对于多个请求，使用 [`Session`](requests.Session) 对象可以提高性能：

```python
# 不推荐：每次创建新连接
for i in range(10):
    response = requests.get('https://api.github.com')

# 推荐：复用连接
with requests.Session() as session:
    for i in range(10):
        response = session.get('https://api.github.com')
```

### 14.2. 设置合理的超时

始终设置超时，避免程序无限等待：

```python
# 推荐
response = requests.get('https://api.github.com', timeout=10)

# 不推荐
response = requests.get('https://api.github.com')  # 可能永久阻塞
```

### 14.3. 处理异常

始终处理可能的异常：

```python
try:
    response = requests.get('https://api.github.com', timeout=10)
    response.raise_for_status()
    data = response.json()
except requests.exceptions.RequestException as e:
    # 处理所有requests相关异常
    print(f'请求失败: {e}')
```

### 14.4. 使用流式下载大文件

```python
# 推荐：流式下载
response = requests.get('https://example.com/large_file.zip', stream=True)
with open('file.zip', 'wb') as f:
    for chunk in response.iter_content(chunk_size=8192):
        f.write(chunk)

# 不推荐：一次性加载到内存
response = requests.get('https://example.com/large_file.zip')
with open('file.zip', 'wb') as f:
    f.write(response.content)
```

### 14.5. 设置User-Agent

许多网站会检查User-Agent，建议设置合适的值：

```python
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}
response = requests.get('https://example.com', headers=headers)
```

## 15. 总结

Requests库是Python中进行HTTP请求的最佳选择，它提供了：

- **简洁的API**：易于学习和使用
- **强大的功能**：支持所有HTTP特性
- **良好的文档**：官方文档详细完善
- **活跃的社区**：问题能快速得到解答

通过本教程，你应该已经掌握了Requests库的核心功能和最佳实践。无论是进行API调用、网页爬虫还是Web开发，Requests都能帮助你高效地完成HTTP请求任务。

## 参考资源

- [Requests官方文档](https://requests.readthedocs.io/)
- [HTTP状态码参考](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Status)
- [RESTful API设计指南](https://restfulapi.net/)