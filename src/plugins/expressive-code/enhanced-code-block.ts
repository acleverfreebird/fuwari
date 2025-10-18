import { definePlugin } from "@expressive-code/core";
import type { Element } from "hast";

/**
 * 增强代码块插件
 * 功能：
 * 1. 为所有代码块添加统一的标题栏（语言标签 + 复制按钮）
 * 2. 为超过指定行数的代码块添加折叠功能
 * 3. 添加渐变蒙层和展开/收起按钮
 */
export function pluginEnhancedCodeBlock(
	options: { collapseAfter?: number } = {},
) {
	const collapseAfter = options.collapseAfter ?? 20;

	return definePlugin({
		name: "Enhanced Code Block",
		hooks: {
			postprocessRenderedBlock: (context) => {
				const { codeBlock, renderData } = context;

				// 获取代码语言
				const language = codeBlock.language || "text";
				const lineCount = codeBlock.code.split("\n").length;
				const shouldCollapse = lineCount > collapseAfter;

				// 遍历AST查找pre元素
				function traverse(node: Element) {
					if (node.type === "element" && node.tagName === "pre") {
						processCodeBlock(node, language, shouldCollapse, lineCount);
						return;
					}
					if (node.children) {
						for (const child of node.children) {
							if (child.type === "element") traverse(child);
						}
					}
				}

				traverse(renderData.blockAst);
			},
		},
	});
}

/**
 * 处理单个代码块，添加标题栏、折叠容器和展开按钮
 */
function processCodeBlock(
	preNode: Element,
	language: string,
	shouldCollapse: boolean,
	lineCount: number,
) {
	// 1. 创建标题栏
	const header = createCodeHeader(language);

	// 2. 克隆pre元素用于包装
	const preClone: Element = {
		type: "element",
		tagName: "pre",
		properties: { ...(preNode.properties || {}) },
		children: [...(preNode.children || [])],
	};

	// 3. 创建代码内容包装器，并将pre元素放入其中
	const contentWrapper = createContentWrapper(shouldCollapse);

	// 将克隆的pre元素添加到内容包装器中
	if (shouldCollapse) {
		// 如果需要折叠，pre元素应该在渐变蒙层之前
		contentWrapper.children = [preClone, ...contentWrapper.children];
	} else {
		contentWrapper.children = [preClone];
	}

	// 4. 创建展开/收起按钮（仅在需要折叠时）
	const expandButton = shouldCollapse ? createExpandButton() : null;

	// 5. 重组DOM结构 - 将原始pre节点转换为容器
	preNode.tagName = "div";
	preNode.properties = {
		className: ["enhanced-code-block"],
	};
	preNode.children = [header, contentWrapper];

	// 如果需要折叠，添加展开按钮
	if (expandButton) {
		preNode.children.push(expandButton);
	}
}

/**
 * 创建代码块标题栏
 */
function createCodeHeader(language: string): Element {
	return {
		type: "element",
		tagName: "div",
		properties: {
			className: ["code-header"],
		},
		children: [
			// 语言标签
			{
				type: "element",
				tagName: "span",
				properties: {
					className: ["code-language"],
				},
				children: [
					{
						type: "text",
						value: language.toUpperCase(),
					},
				],
			},
			// 复制按钮
			createCopyButton(),
		],
	};
}

/**
 * 创建复制按钮
 */
function createCopyButton(): Element {
	return {
		type: "element",
		tagName: "button",
		properties: {
			className: ["copy-btn"],
			"aria-label": "复制代码",
			type: "button",
		},
		children: [
			{
				type: "element",
				tagName: "div",
				properties: {
					className: ["copy-btn-icon"],
				},
				children: [
					// 复制图标
					{
						type: "element",
						tagName: "svg",
						properties: {
							viewBox: "0 -960 960 960",
							xmlns: "http://www.w3.org/2000/svg",
							className: ["copy-icon"],
						},
						children: [
							{
								type: "element",
								tagName: "path",
								properties: {
									d: "M368.37-237.37q-34.48 0-58.74-24.26-24.26-24.26-24.26-58.74v-474.26q0-34.48 24.26-58.74 24.26-24.26 58.74-24.26h378.26q34.48 0 58.74 24.26 24.26 24.26 24.26 58.74v474.26q0 34.48-24.26 58.74-24.26 24.26-58.74 24.26H368.37Zm0-83h378.26v-474.26H368.37v474.26Zm-155 238q-34.48 0-58.74-24.26-24.26-24.26-24.26-58.74v-515.76q0-17.45 11.96-29.48 11.97-12.02 29.33-12.02t29.54 12.02q12.17 12.03 12.17 29.48v515.76h419.76q17.45 0 29.48 11.96 12.02 11.97 12.02 29.33t-12.02 29.54q-12.03 12.17-29.48 12.17H213.37Zm155-238v-474.26 474.26Z",
								},
								children: [],
							},
						],
					},
					// 成功图标
					{
						type: "element",
						tagName: "svg",
						properties: {
							viewBox: "0 -960 960 960",
							xmlns: "http://www.w3.org/2000/svg",
							className: ["success-icon"],
						},
						children: [
							{
								type: "element",
								tagName: "path",
								properties: {
									d: "m389-377.13 294.7-294.7q12.58-12.67 29.52-12.67 16.93 0 29.61 12.67 12.67 12.68 12.67 29.53 0 16.86-12.28 29.14L419.07-288.41q-12.59 12.67-29.52 12.67-16.94 0-29.62-12.67L217.41-430.93q-12.67-12.68-12.79-29.45-.12-16.77 12.55-29.45 12.68-12.67 29.62-12.67 16.93 0 29.28 12.67L389-377.13Z",
								},
								children: [],
							},
						],
					},
				],
			},
		],
	};
}

/**
 * 创建代码内容包装器
 */
function createContentWrapper(shouldCollapse: boolean): Element {
	const wrapper: Element = {
		type: "element",
		tagName: "div",
		properties: {
			className: ["code-content-wrapper"],
		},
		children: [],
	};

	// 如果需要折叠，添加相关属性和渐变蒙层
	if (shouldCollapse) {
		wrapper.properties!["data-collapsed"] = "true";

		// 添加渐变蒙层
		const fadeOverlay: Element = {
			type: "element",
			tagName: "div",
			properties: {
				className: ["code-fade-overlay"],
				"aria-hidden": "true",
			},
			children: [],
		};

		// 渐变蒙层会在children数组的最后
		wrapper.children = [fadeOverlay];
	}

	return wrapper;
}

/**
 * 创建展开/收起按钮
 */
function createExpandButton(): Element {
	return {
		type: "element",
		tagName: "button",
		properties: {
			className: ["code-expand-btn"],
			"aria-label": "展开代码",
			"aria-expanded": "false",
			type: "button",
		},
		children: [
			{
				type: "element",
				tagName: "span",
				properties: {
					className: ["expand-text"],
				},
				children: [
					{
						type: "text",
						value: "展开代码",
					},
				],
			},
			{
				type: "element",
				tagName: "span",
				properties: {
					className: ["collapse-text"],
				},
				children: [
					{
						type: "text",
						value: "收起代码",
					},
				],
			},
		],
	};
}
