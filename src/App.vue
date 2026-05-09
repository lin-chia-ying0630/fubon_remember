<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

type PageKey = 'upload' | 'gallery'

type NavItem = {
  id: PageKey
  label: string
  meta: string
  icon: string
}

type MemoryItem = {
  id: number
  title: string
  photoName: string
  markdownName: string
  situation: string
  imageUrl: string
  githubPath: string
  isDraft?: boolean
  note: {
    x: number
    y: number
    rotate: string
    color: string
    zIndex: number
    scale: number
  }
}

type StoredState = {
  activePage: PageKey
  isCollapsed: boolean
  sidebarHue: number
  sidebarBrightness: number
}

type StaticMemoryItem = Omit<MemoryItem, 'imageUrl'> & {
  photoUrl: string
}

const storageKey = 'fubon-remember-state'
const githubTokenKey = 'fubon-remember-github-token'
const githubOwner = 'lin-chia-ying0630'
const githubRepo = 'fubon_remember'
const githubBranch = 'main'
const imageFallback = 'linear-gradient(135deg, #2f5d7c 0%, #9bc4dd 46%, #f5ddb0 100%)'

const navItems: NavItem[] = [
  { id: 'upload', label: '上傳', meta: '照片', icon: '↑' },
  { id: 'gallery', label: '展示照片', meta: '便利貼照片牆', icon: '▧' },
]

const sampleItems: StaticMemoryItem[] = [
  {
    id: 1,
    title: '家庭晚餐',
    photoName: 'family-dinner.jpg',
    markdownName: 'family-dinner.md',
    situation: '大家一起整理老照片時想起這天的晚餐，適合標記為家庭聚會與重要回憶。',
    photoUrl: 'photos/family-dinner.svg',
    githubPath: 'memories/2026/family-dinner.md',
    note: { x: 42, y: 38, rotate: '-4deg', color: '#fff3b8', zIndex: 1, scale: 1 },
  },
  {
    id: 2,
    title: '海邊散步',
    photoName: 'coast-walk.jpg',
    markdownName: 'coast-walk.md',
    situation: '午後在宜蘭海邊散步，照片裡的光線偏暖，說明可記錄天氣、同行者與當時心情。',
    photoUrl: 'photos/coast-walk.svg',
    githubPath: 'memories/2026/coast-walk.md',
    note: { x: 430, y: 120, rotate: '5deg', color: '#c9f0ff', zIndex: 2, scale: 1 },
  },
  {
    id: 3,
    title: '生日合照',
    photoName: 'birthday-group.png',
    markdownName: 'birthday-group.md',
    situation: '生日合照需要補上主角、地點與祝福內容，方便之後從 GitHub 追蹤每張照片的文字版本。',
    photoUrl: 'photos/birthday-group.svg',
    githubPath: 'memories/2026/birthday-group.md',
    note: { x: 210, y: 380, rotate: '3deg', color: '#ffd9e6', zIndex: 3, scale: 1 },
  },
]

const activePage = ref<PageKey>('upload')
const isCollapsed = ref(false)
const sidebarHue = ref(218)
const sidebarBrightness = ref(46)
const title = ref('新照片回憶')
const situation = ref('請描述這張照片的時間、地點、人物、事件與值得記住的情境。')
const selectedPhotoName = ref('memory-photo.jpg')
const selectedPhotoPreview = ref('')
const gitPublishMessage = ref('')
const githubToken = ref(sessionStorage.getItem(githubTokenKey) ?? '')
const isPublishingToGit = ref(false)
const staticMemoryItems = ref<MemoryItem[]>(toMemoryItems(sampleItems))
const draftMemoryItems = ref<MemoryItem[]>([])
const stickyBoardRef = ref<HTMLElement | null>(null)

const storedState = loadStoredState()

if (storedState) {
  activePage.value = storedState.activePage
  isCollapsed.value = storedState.isCollapsed
  sidebarHue.value = storedState.sidebarHue
  sidebarBrightness.value = storedState.sidebarBrightness
}

const activeNavItem = computed(
  () => navItems.find((item) => item.id === activePage.value) ?? navItems[0],
)

const memoryItems = computed<MemoryItem[]>(() => [
  ...draftMemoryItems.value,
  ...staticMemoryItems.value,
])
const latestDraft = computed(() => draftMemoryItems.value[0] ?? null)

const sidebarStyle = computed(() => ({
  '--sidebar-hue': `${sidebarHue.value}`,
  '--sidebar-lightness': `${sidebarBrightness.value}%`,
}))

const markdownFileName = computed(() => {
  const baseName = selectedPhotoName.value.replace(/\.[^/.]+$/, '') || 'memory-photo'
  return `${baseName}.md`
})

const markdownPreview = computed(() => `# ${title.value}

photo: ${selectedPhotoName.value}
markdown: ${markdownFileName.value}
github_path: memories/2026/${markdownFileName.value}

## 情境說明

${situation.value}
`)

watch(
  [activePage, isCollapsed, sidebarHue, sidebarBrightness],
  () => {
    const state: StoredState = {
      activePage: activePage.value,
      isCollapsed: isCollapsed.value,
      sidebarHue: sidebarHue.value,
      sidebarBrightness: sidebarBrightness.value,
    }

    localStorage.setItem(storageKey, JSON.stringify(state))
  },
  { deep: true },
)

onMounted(() => {
  void loadStaticMemories()
})

function loadStoredState(): StoredState | null {
  const rawState = localStorage.getItem(storageKey)

  if (!rawState) return null

  try {
    return JSON.parse(rawState) as StoredState
  } catch {
    return null
  }
}

async function loadStaticMemories() {
  try {
    const response = await fetch(assetUrl('memories/index.json'))

    if (!response.ok) return

    staticMemoryItems.value = toMemoryItems((await response.json()) as StaticMemoryItem[])
  } catch {
    staticMemoryItems.value = toMemoryItems(sampleItems)
  }
}

function toMemoryItems(items: StaticMemoryItem[]): MemoryItem[] {
  return items.map((item) => ({
    ...item,
    imageUrl: assetUrl(item.photoUrl),
  }))
}

function assetUrl(path: string) {
  if (/^(https?:|data:)/.test(path)) return path

  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

function photoStyle(item: MemoryItem) {
  if (/^(data:|https?:)/.test(item.imageUrl) || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(item.imageUrl)) {
    return { backgroundImage: `url(${item.imageUrl})` }
  }

  return { background: item.imageUrl }
}

function handlePhotoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  selectedPhotoName.value = file.name

  const reader = new FileReader()

  reader.addEventListener('load', () => {
    selectedPhotoPreview.value = typeof reader.result === 'string' ? reader.result : ''
  })
  reader.readAsDataURL(file)
}

function addDraftToGallery() {
  const id = Date.now()
  const placement = [
    { x: 360, y: 36, rotate: '-2deg', color: '#e3ffd1', zIndex: staticMemoryItems.value.length + 1, scale: 1 },
    { x: 580, y: 330, rotate: '4deg', color: '#fff0c4', zIndex: staticMemoryItems.value.length + 2, scale: 1 },
    { x: 48, y: 520, rotate: '-5deg', color: '#d9e7ff', zIndex: staticMemoryItems.value.length + 3, scale: 1 },
  ][draftMemoryItems.value.length % 3]

  draftMemoryItems.value = [
    {
      id,
      title: title.value,
      photoName: selectedPhotoName.value,
      markdownName: markdownFileName.value,
      situation: situation.value,
      imageUrl: selectedPhotoPreview.value || imageFallback,
      githubPath: `memories/2026/${markdownFileName.value}`,
      isDraft: true,
      note: placement,
    },
    ...draftMemoryItems.value,
  ]
  gitPublishMessage.value = ''
  activePage.value = 'gallery'
}

async function publishLatestDraftToGit() {
  const draft = latestDraft.value

  if (!draft) {
    gitPublishMessage.value = '目前沒有尚未存入 Git 的草稿照片。'
    return
  }

  if (!githubToken.value.trim()) {
    gitPublishMessage.value = '請先輸入 GitHub token。需要 repo contents 讀寫權限。'
    return
  }

  sessionStorage.setItem(githubTokenKey, githubToken.value.trim())
  isPublishingToGit.value = true
  gitPublishMessage.value = '正在寫入 GitHub repo...'

  try {
    const publishedItem = await commitDraftToGitHub(draft)

    draftMemoryItems.value = draftMemoryItems.value.filter((item) => item.id !== draft.id)
    staticMemoryItems.value = [
      {
        ...publishedItem,
        imageUrl: assetUrl(publishedItem.photoUrl),
      },
      ...staticMemoryItems.value,
    ]
    gitPublishMessage.value = [
      '已存入 GitHub repo。',
      `照片：public/${publishedItem.photoUrl}`,
      `Markdown：public/${publishedItem.githubPath}`,
      'GitHub Pages 會自動重新部署，稍等一下大家就會看到同一份內容。',
    ].join('\n')
  } catch (error) {
    gitPublishMessage.value = error instanceof Error ? error.message : '存入 GitHub 失敗。'
  } finally {
    isPublishingToGit.value = false
  }
}

function downloadMarkdown() {
  const blob = new Blob([markdownPreview.value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = markdownFileName.value
  link.click()
  URL.revokeObjectURL(url)
}

function resizeDraftMemory(item: MemoryItem, amount: number) {
  if (!item.isDraft) return

  item.note.scale = Math.min(Math.max(item.note.scale + amount, 0.7), 1.6)
}

function removeDraftMemory(item: MemoryItem) {
  if (!item.isDraft) return

  draftMemoryItems.value = draftMemoryItems.value.filter((memory) => memory.id !== item.id)
}

function showGitPublishHelp() {
  void publishLatestDraftToGit()
}

async function commitDraftToGitHub(draft: MemoryItem) {
  const indexFile = await getGitHubFile('public/memories/index.json')
  const indexItems = JSON.parse(decodeBase64Unicode(indexFile.content)) as StaticMemoryItem[]
  const nextId = Math.max(0, ...indexItems.map((item) => Number(item.id) || 0)) + 1
  const year = new Date().getFullYear()
  const photoExtension = fileExtension(draft.photoName)
  const baseName = uniqueBaseName(slugify(draft.title) || `memory-${nextId}`, indexItems)
  const photoName = `${baseName}${photoExtension}`
  const markdownName = `${baseName}.md`
  const photoPath = `public/photos/${photoName}`
  const markdownPath = `public/memories/${year}/${markdownName}`
  const publishedItem: StaticMemoryItem = {
    id: nextId,
    title: draft.title,
    photoName,
    markdownName,
    photoUrl: `photos/${photoName}`,
    githubPath: `memories/${year}/${markdownName}`,
    situation: draft.situation,
    note: {
      ...draft.note,
      zIndex: nextId,
    },
  }

  await putGitHubFile(photoPath, dataUrlToBase64(draft.imageUrl), `Add ${draft.title} photo`)
  await putGitHubFile(
    markdownPath,
    encodeTextToBase64(markdownFor(publishedItem)),
    `Add ${draft.title} memory markdown`,
  )
  await putGitHubFile(
    'public/memories/index.json',
    encodeTextToBase64(`${JSON.stringify([publishedItem, ...indexItems], null, 2)}\n`),
    `Add ${draft.title} memory`,
    indexFile.sha,
  )

  return publishedItem
}

async function getGitHubFile(path: string) {
  const response = await githubFetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}?ref=${githubBranch}`)
  const data = await response.json() as { content?: string; sha?: string; message?: string }

  if (!response.ok || !data.content || !data.sha) {
    throw new Error(data.message ?? `無法讀取 ${path}`)
  }

  return {
    content: data.content.replace(/\s/g, ''),
    sha: data.sha,
  }
}

async function putGitHubFile(path: string, content: string, message: string, sha?: string) {
  const response = await githubFetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      branch: githubBranch,
      content,
      message,
      sha,
    }),
  })
  const data = await response.json() as { message?: string }

  if (!response.ok) {
    throw new Error(data.message ?? `無法寫入 ${path}`)
  }
}

async function githubFetch(url: string, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${githubToken.value.trim()}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    },
  })
}

function markdownFor(item: StaticMemoryItem) {
  return `# ${item.title}

photo: ${item.photoUrl}
markdown: ${item.githubPath}

## 情境說明

${item.situation}
`
}

function fileExtension(fileName: string) {
  const match = fileName.match(/\.[a-z0-9]+$/i)

  return match?.[0].toLowerCase() ?? '.jpg'
}

function uniqueBaseName(baseName: string, items: StaticMemoryItem[]) {
  const usedNames = new Set(items.flatMap((item) => [item.photoName.replace(/\.[^.]+$/, ''), item.markdownName.replace(/\.md$/, '')]))
  let nextBaseName = baseName
  let suffix = 2

  while (usedNames.has(nextBaseName)) {
    nextBaseName = `${baseName}-${suffix}`
    suffix += 1
  }

  return nextBaseName
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function dataUrlToBase64(dataUrl: string) {
  if (!dataUrl.startsWith('data:')) {
    throw new Error('草稿照片不是可上傳的圖片資料，請重新選擇照片。')
  }

  return dataUrl.split(',')[1] ?? ''
}

function encodeTextToBase64(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary)
}

function decodeBase64Unicode(value: string) {
  const binary = atob(value)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}
</script>

<template>
  <div class="app-shell">
    <aside
      class="sidebar"
      :class="{ 'is-collapsed': isCollapsed }"
      :style="sidebarStyle"
      aria-label="主選單"
    >
      <div class="sidebar__header">
        <div class="brand" aria-label="Fubon Remember">
          <span class="brand__mark">F</span>
          <span class="brand__text">Fubon Remember</span>
        </div>
        <button
          class="icon-button"
          type="button"
          :aria-label="isCollapsed ? '展開側邊欄' : '收合側邊欄'"
          :title="isCollapsed ? '展開側邊欄' : '收合側邊欄'"
          @click="isCollapsed = !isCollapsed"
        >
          <span aria-hidden="true">{{ isCollapsed ? '›' : '‹' }}</span>
        </button>
      </div>

      <nav class="nav-list" aria-label="功能導覽">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-item"
          :class="{ 'is-active': activePage === item.id }"
          type="button"
          :title="isCollapsed ? `${item.label} - ${item.meta}` : undefined"
          @click="activePage = item.id"
        >
          <span class="nav-item__icon" aria-hidden="true">{{ item.icon }}</span>
          <span class="nav-item__content">
            <span class="nav-item__label">{{ item.label }}</span>
            <span class="nav-item__meta">{{ item.meta }}</span>
          </span>
        </button>
      </nav>

      <div class="sidebar__controls">
        <label class="range-control" for="sidebar-color">
          <span class="range-control__label">整體顏色</span>
          <span class="range-control__value">{{ sidebarHue }}°</span>
        </label>
        <input
          id="sidebar-color"
          v-model.number="sidebarHue"
          class="range-slider"
          type="range"
          min="0"
          max="360"
          step="1"
          aria-label="調整側邊欄整體顏色"
        />

        <label class="range-control" for="sidebar-brightness">
          <span class="range-control__label">整體亮度</span>
          <span class="range-control__value">{{ sidebarBrightness }}%</span>
        </label>
        <input
          id="sidebar-brightness"
          v-model.number="sidebarBrightness"
          class="range-slider"
          type="range"
          min="26"
          max="72"
          step="1"
          aria-label="調整側邊欄整體亮度"
        />
      </div>
    </aside>

    <main class="workspace">
      <section class="workspace__intro" aria-labelledby="page-title">
        <p class="eyebrow">{{ activeNavItem.meta }}</p>
        <h1 id="page-title">{{ activeNavItem.label }}</h1>
      </section>

      <section v-if="activePage === 'upload'" class="upload-page" aria-label="上傳照片">
        <div class="upload-layout">
          <div class="upload-dropzone">
            <div
              v-if="selectedPhotoPreview"
              class="upload-dropzone__preview"
              :style="{ backgroundImage: `url(${selectedPhotoPreview})` }"
              aria-label="已選擇照片預覽"
            ></div>
            <div v-else class="upload-dropzone__placeholder">
              <span class="upload-dropzone__icon" aria-hidden="true">↑</span>
              <h2>選擇一張照片</h2>
            </div>
            <label class="file-button" for="photo-upload">選擇照片</label>
            <input id="photo-upload" type="file" accept="image/*" @change="handlePhotoChange" />
          </div>

          <form class="upload-form" @submit.prevent="addDraftToGallery">
            <label>
              照片標題
              <input v-model="title" type="text" aria-label="照片標題" />
            </label>
            <label>
              照片檔名
              <input v-model="selectedPhotoName" type="text" aria-label="照片檔名" />
            </label>
            <label>
              情境說明
              <textarea v-model="situation" rows="7" aria-label="照片情境說明"></textarea>
            </label>
            <button class="primary-button" type="submit">加入展示</button>
          </form>
        </div>

        <div class="github-panel" aria-label="GitHub 上傳資訊">
          <div>
            <span class="section-label">GitHub 共同發布</span>
            <h2>{{ selectedPhotoName }} ↔ {{ markdownFileName }}</h2>
            <p>要讓大家看到同一份，請把照片發布到 GitHub：public/photos 與 public/memories/2026。</p>
            <button class="secondary-button" type="button" @click="downloadMarkdown">
              下載 Markdown
            </button>
          </div>
          <pre>{{ markdownPreview }}</pre>
        </div>
      </section>

      <section v-else class="gallery-page" aria-label="展示照片">
        <div class="gallery-toolbar">
          <div>
            <span class="section-label">便利貼展示牆</span>
          </div>
          <button class="primary-button" type="button" @click="activePage = 'upload'">
            新增照片
          </button>
          <button
            class="secondary-button"
            type="button"
            :disabled="isPublishingToGit"
            @click="showGitPublishHelp"
          >
            存入 GIT
          </button>
        </div>

        <div class="github-panel github-panel--single" aria-label="存入 Git 設定">
          <div>
            <span class="section-label">GitHub Repo</span>
            <h2>{{ githubOwner }}/{{ githubRepo }}</h2>
            <p>請使用有 contents 讀寫權限的 GitHub token。</p>
          </div>
          <label class="token-field">
            GitHub token
            <input
              v-model="githubToken"
              type="password"
              autocomplete="off"
              placeholder="github_pat_..."
              aria-label="GitHub token"
            />
          </label>
        </div>

        <div v-if="gitPublishMessage" class="github-panel github-panel--single" aria-label="存入 Git 狀態">
          <div>
            <span class="section-label">狀態</span>
            <h2>{{ isPublishingToGit ? '寫入中' : '存入 GIT' }}</h2>
          </div>
          <pre>{{ gitPublishMessage }}</pre>
        </div>

        <div ref="stickyBoardRef" class="sticky-board">
          <article
            v-for="item in memoryItems"
            :key="item.id"
            class="sticky-memory"
            :style="{
              top: `${item.note.y}px`,
              left: `${item.note.x}px`,
              rotate: item.note.rotate,
              scale: item.note.scale,
              '--note-color': item.note.color,
              zIndex: item.note.zIndex,
            }"
          >
            <div
              class="sticky-memory__photo"
              :style="photoStyle(item)"
            ></div>
            <div class="sticky-memory__note">
              <div v-if="item.isDraft" class="sticky-memory__tools" aria-label="草稿便利貼控制">
                <button
                  type="button"
                  aria-label="縮小便利貼"
                  title="縮小"
                  @click="resizeDraftMemory(item, -0.1)"
                >
                  -
                </button>
                <button
                  type="button"
                  aria-label="放大便利貼"
                  title="放大"
                  @click="resizeDraftMemory(item, 0.1)"
                >
                  +
                </button>
                <button
                  type="button"
                  aria-label="刪除便利貼"
                  title="刪除"
                  @click="removeDraftMemory(item)"
                >
                  ×
                </button>
              </div>
              <small v-if="item.isDraft" class="sticky-memory__status">尚未存入 Git</small>
              <strong>{{ item.title }}</strong>
              <p>{{ item.situation }}</p>
              <span>{{ item.photoName }} ↔ {{ item.markdownName }}</span>
              <small>{{ item.githubPath }}</small>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>
