import { definePlugin } from "@expressive-code/core";

/**
 * 自动折叠长代码块的插件
 * 当代码块超过指定行数时，自动添加折叠标记
 */
export function pluginAutoCollapse(options: { collapseAfter?: number } = {}) {
	const collapseAfter = options.collapseAfter ?? 20;

	return definePlugin({
		name: "Auto Collapse Long Code Blocks",
		hooks: {
			preprocessMetadata: ({ codeBlock }) => {
				// 获取代码行数
				const lines = codeBlock.code.split("\n");
				const lineCount = lines.length;

				// 如果代码块超过指定行数，添加折叠元数据
				if (lineCount > collapseAfter) {
					// 设置折叠范围：从第 collapseAfter 行开始到最后一行
					const collapseStart = collapseAfter;
					const collapseEnd = lineCount;

					// 添加折叠标记到代码块的元数据中
					// 使用 expressive-code 的 collapse 语法
					const existingMeta = codeBlock.meta || "";
					const collapseMeta = `collapse={${collapseStart}-${collapseEnd}}`;

					// 如果元数据中还没有 collapse 标记，则添加
					if (!existingMeta.includes("collapse")) {
						codeBlock.meta = existingMeta
							? `${existingMeta} ${collapseMeta}`
							: collapseMeta;
					}
				}
			},
		},
	});
}
