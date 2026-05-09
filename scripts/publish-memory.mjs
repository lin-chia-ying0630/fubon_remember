import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const indexPath = path.join(repoRoot, 'public', 'memories', 'index.json')
const photosDir = path.join(repoRoot, 'public', 'photos')
const memoryRoot = path.join(repoRoot, 'public', 'memories')
const supportedPhotoExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'])

const notePlacements = [
  { x: 42, y: 38, rotate: '-4deg', color: '#fff3b8' },
  { x: 430, y: 120, rotate: '5deg', color: '#c9f0ff' },
  { x: 210, y: 380, rotate: '3deg', color: '#ffd9e6' },
  { x: 360, y: 36, rotate: '-2deg', color: '#e3ffd1' },
  { x: 580, y: 330, rotate: '4deg', color: '#fff0c4' },
  { x: 48, y: 520, rotate: '-5deg', color: '#d9e7ff' },
]

const options = parseArgs(process.argv.slice(2))

if (options.help) {
  printHelp()
  process.exit(0)
}

if (!options.photo || !options.title || (!options.situation && !options['situation-file'])) {
  printHelp()
  process.exit(1)
}

const photoPath = path.resolve(String(options.photo))
const photoExtension = path.extname(photoPath).toLowerCase()

if (!supportedPhotoExtensions.has(photoExtension)) {
  throw new Error(`Unsupported photo file type: ${photoExtension || '(none)'}`)
}

const title = String(options.title).trim()
const situation = await readSituation(options)
const year = String(options.year ?? new Date().getFullYear())
const slugSource = options.slug ?? title ?? path.basename(photoPath, photoExtension)
const slug = await uniqueSlug(slugify(String(slugSource)))
const photoName = `${slug}${photoExtension}`
const markdownName = `${slug}.md`
const markdownDir = path.join(memoryRoot, year)
const markdownPath = path.join(markdownDir, markdownName)
const targetPhotoPath = path.join(photosDir, photoName)

const indexItems = JSON.parse(await readFile(indexPath, 'utf8'))
const nextId = Math.max(0, ...indexItems.map((item) => Number(item.id) || 0)) + 1
const placement = notePlacements[(nextId - 1) % notePlacements.length]

const item = {
  id: nextId,
  title,
  photoName,
  markdownName,
  photoUrl: `photos/${photoName}`,
  githubPath: `memories/${year}/${markdownName}`,
  situation,
  note: {
    ...placement,
    zIndex: nextId,
    scale: 1,
  },
}

await mkdir(photosDir, { recursive: true })
await mkdir(markdownDir, { recursive: true })
await copyFile(photoPath, targetPhotoPath)
await writeFile(markdownPath, markdownFor(item), 'utf8')
await writeFile(indexPath, `${JSON.stringify([item, ...indexItems], null, 2)}\n`, 'utf8')

console.log(`Published memory: ${title}`)
console.log(`Photo: public/photos/${photoName}`)
console.log(`Markdown: public/memories/${year}/${markdownName}`)
console.log('Next: npm run build && git add public && git commit -m "Add memory" && git push origin main')

function parseArgs(args) {
  const parsed = {}

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--help' || arg === '-h') {
      parsed.help = true
      continue
    }

    if (!arg.startsWith('--')) {
      continue
    }

    const [key, inlineValue] = arg.slice(2).split('=', 2)
    const nextValue = args[index + 1]

    if (inlineValue !== undefined) {
      parsed[key] = inlineValue
    } else if (nextValue && !nextValue.startsWith('--')) {
      parsed[key] = nextValue
      index += 1
    } else {
      parsed[key] = true
    }
  }

  return parsed
}

async function readSituation(args) {
  if (args['situation-file']) {
    return (await readFile(path.resolve(String(args['situation-file'])), 'utf8')).trim()
  }

  return String(args.situation).trim()
}

async function uniqueSlug(baseSlug) {
  const indexItems = JSON.parse(await readFile(indexPath, 'utf8'))
  const used = new Set(indexItems.flatMap((item) => [item.photoName, item.markdownName]))
  let slug = baseSlug || 'memory'
  let suffix = 2

  while ([...supportedPhotoExtensions].some((extension) => used.has(`${slug}${extension}`)) || used.has(`${slug}.md`)) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return slug
}

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function markdownFor(item) {
  return `# ${item.title}

photo: ${item.photoUrl}
markdown: ${item.githubPath}

## 情境說明

${item.situation}
`
}

function printHelp() {
  console.log(`Usage:
  npm run publish:memory -- --photo ./photo.jpg --title "家庭聚餐" --situation "照片說明"

Options:
  --photo            Photo file path. Required.
  --title            Memory title. Required.
  --situation        Memory description. Required unless --situation-file is used.
  --situation-file   Text file containing the description.
  --year             Memory year. Defaults to current year.
  --slug             URL/file-safe name. Defaults from title.
`)
}
