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
				const lines = codeBlock.code.split("\n");
				const lineCount = lines.length;

				if (lineCount > collapseAfter) {
					const collapseStart = collapseAfter + 1;
					const collapseEnd = lineCount;

					const existingMeta = codeBlock.meta || "";
					const collapseMeta = `collapse={${collapseStart}-${collapseEnd}}`;

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
