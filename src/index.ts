#!/usr/bin/env node
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import * as p from '@clack/prompts'
import { bold, cyan, green, red, yellow } from 'kolorist'

const VALID_NAME_RE = /^[\w.\-]+$/

const TEMPLATES = [
  {
    label: 'bingwu-my-monorepo',
    value: 'monorepo',
    hint: 'Monorepo 项目模版',
    url: 'https://github.com/BINGWU2003/bingwu-my-monorepo.git',
  },
  {
    label: 'starter-ts',
    value: 'starter-ts',
    hint: 'TypeScript 快速启动模版',
    url: 'https://github.com/BINGWU2003/starter-ts.git',
  },
]

async function main(): Promise<void> {
  const argProjectName = process.argv[2]
  p.intro(bold(cyan(' bingwu-create ')))

  // 项目名称
  let projectName: string
  if (argProjectName) {
    projectName = argProjectName
  }
  else {
    const name = await p.text({
      message: '项目名称',
      placeholder: 'my-project',
      validate(value) {
        if (!value.trim())
          return '项目名称不能为空'
        if (!VALID_NAME_RE.test(value))
          return '只允许字母、数字、连字符、下划线和点'
      },
    })
    if (p.isCancel(name)) {
      p.cancel('已取消')
      process.exit(0)
    }
    projectName = name.trim()
  }

  // 选择模版
  const template = await p.select({
    message: '选择模版',
    options: TEMPLATES.map(t => ({
      label: t.label,
      value: t.value,
      hint: t.hint,
    })),
  })
  if (p.isCancel(template)) {
    p.cancel('已取消')
    process.exit(0)
  }

  const chosen = TEMPLATES.find(t => t.value === template)!
  const targetDir = path.resolve(process.cwd(), projectName)

  // 目录冲突检查
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir)
    if (files.length > 0) {
      const overwrite = await p.confirm({
        message: `目录 ${yellow(projectName)} 已存在且不为空，是否覆盖？`,
        initialValue: false,
      })
      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel('已取消')
        process.exit(0)
      }
      fs.rmSync(targetDir, { recursive: true, force: true })
    }
  }

  const spinner = p.spinner()

  // clone
  spinner.start(`正在克隆模版 ${cyan(chosen.label)}...`)
  try {
    execSync(`git clone --depth=1 ${chosen.url} ${JSON.stringify(targetDir)}`, {
      stdio: 'pipe',
    })
  }
  catch {
    spinner.stop(red('克隆失败'), 1)
    p.log.error(`请确认网络连接正常，或手动运行：\ngit clone ${chosen.url}`)
    process.exit(1)
  }

  // 清除 git 历史
  spinner.message('正在清除 git 历史...')
  const gitDir = path.join(targetDir, '.git')
  if (fs.existsSync(gitDir))
    fs.rmSync(gitDir, { recursive: true, force: true })

  spinner.stop(green('✔ 项目创建成功！'))

  p.note(
    [
      `  cd ${cyan(projectName)}`,
      `  pnpm install`,
      `  pnpm dev`,
    ].join('\n'),
    '接下来',
  )

  p.outro(`祝你编码愉快 🎉`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
