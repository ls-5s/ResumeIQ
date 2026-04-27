# -*- coding: utf-8 -*-
import re

path = r'D:/AIScaning/server/src/services/setting/ai.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the generateInterviewQuestions function
func_start = content.find('export async function generateInterviewQuestions')
if func_start == -1:
    print('Function not found!')
    exit(1)

# Find the prompt within this function
prompt_start = content.find('const prompt = ', func_start)
prompt_end_marker = '`;'  # The template literal end
prompt_end = content.find(prompt_end_marker, prompt_start)
if prompt_end == -1:
    print('Prompt end not found!')
    exit(1)

prompt_end += len(prompt_end_marker)

old_prompt = content[prompt_start:prompt_end]
print(f'Found prompt at position {prompt_start}-{prompt_end}')
print(f'Length: {len(old_prompt)}')

new_prompt = r'''  const prompt = `你是资深技术面试官。请根据以下简历内容，生成针对性的面试题。

简历内容：
${resume.parsedContent || ""}
${customFocusSection}

请生成至少 5 道面试题，覆盖以下方面（尽量每类都出题）：
1. 项目经历深挖（考察简历中提到的项目，从背景、职责、技术细节、难点、成果等角度切入）
2. 技术知识点（根据项目使用的技术栈，深挖原理和实践）
3. 候选人的薄弱环节或需要验证的能力（追问验证）
4. 行为面试题（STAR 法则，考察协作与解决问题的能力）

请严格按以下 Markdown 格式输出（JSON 放在代码块中，方便程序解析）：

{
  ## 本轮面试的考察重点和整体思路（1-3 句话）
  ### 项目经历深挖
  **题目**：面试题正文
  **考察要点**：考察要点1，考察要点2
  **难度**：基础|中等|进阶
  **追问**：追问方向（如无则填空字符串或省略）
  ### 技术知识点
  **题目**：面试题正文
  **考察要点**：考察要点1，考察要点2
  **难度**：基础|中等|进阶
  **追问**：追问方向（如无则填空字符串或省略）
}
;'''

if old_prompt == new_prompt:
    print('Prompt already updated!')
else:
    new_content = content[:prompt_start] + new_prompt + content[prompt_end:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'Updated prompt. New length: {len(new_content)}')
