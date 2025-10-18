import { definePlugin } from "@expressive-code/core";
import type { Element } from "hast";

/**
 * 代码块折叠插件
 * 功能：为超过指定行数的代码块添加折叠功能
 * - 添加折叠容器和渐变蒙层
 * - 添加展开/收起按钮
 */
export function pluginCodeBlockCollapse(
	options: { collapseAfter?: number } = {},
) {
	const collapseAfter = options.collapseAfter ?? 20;

	return definePlugin({
		name: "Code Block Collapse",
		hooks: {
			postprocessRenderedBlock: (context) => {
				const { codeBlock, renderData } = context;

				// 直接检查代码行数
				const lines = codeBlock.code.split("\n");
				const lineCount = lines.length;

				// 如果代码行数不超过阈值，不添加折叠功能
				if (lineCount <= collapseAfter) {
					return;
				}

				// 遍历AST查找pre元素
				function traverse(node: Element) {
					if (node.type === "element" && node.tagName === "pre") {
						wrapCodeBlockForCollapse(node);
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
 * 为代码块添加折叠包装器和展开按钮
 * 注意：不修改pre元素本身，而是在其父级添加包装
 */
function wrapCodeBlockForCollapse(preNode: Element) {
	// 为pre元素添加折叠相关的data属性和类名
	if (!preNode.properties) {
		preNode.properties = {};
	}

	// 添加折叠标记类
	const className = (preNode.properties.className as string[]) || [];
	if (!className.includes("collapsible-pre")) {
		className.push("collapsible-pre");
	}
	preNode.properties.className = className;
	preNode.properties["data-collapsed"] = "true";

	// 在pre元素内部添加渐变蒙层
	const fadeOverlay: Element = {
		type: "element",
		tagName: "div",
		properties: {
			className: ["code-fade-overlay"],
			"aria-hidden": "true",
		},
		children: [],
	};

	// 将渐变蒙层添加到pre的children末尾
	if (!preNode.children) {
		preNode.children = [];
	}
	preNode.children.push(fadeOverlay);

	// 创建展开/收起按钮（将在JavaScript中插入到正确位置）
	const expandButton: Element = {
		type: "element",
		tagName: "button",
		properties: {
			className: ["code-expand-btn"],
			"aria-label": "展开代码",
			"aria-expanded": "false",
			type: "button",
			"data-code-expand": "true",
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

	// 将按钮添加到pre元素之后
	preNode.children.push(expandButton);
}
