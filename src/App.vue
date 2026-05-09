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
  imageDataKey?: string
  githubPath: string
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
  localMemoryItems: MemoryItem[]
  hiddenStaticIds: number[]
  topZIndex: number
}

type StaticMemoryItem = Omit<MemoryItem, 'imageUrl'> & {
  photoUrl: string
}

const storageKey = 'fubon-remember-state'
const imageDbName = 'fubon-remember-images'
const imageStoreName = 'photos'
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
const staticMemoryItems = ref<MemoryItem[]>(toMemoryItems(sampleItems))
const localMemoryItems = ref<MemoryItem[]>([])
const hiddenStaticIds = ref<number[]>([])
const stickyBoardRef = ref<HTMLElement | null>(null)
const topZIndex = ref(10)
const activeDrag = ref<{
  id: number
  offsetX: number
  offsetY: number
} | null>(null)

const storedState = loadStoredState()

if (storedState) {
  const storedLocalItems =
    storedState.localMemoryItems ??
    (storedState as StoredState & { memoryItems?: MemoryItem[] }).memoryItems ??
    []

  activePage.value = storedState.activePage
  isCollapsed.value = storedState.isCollapsed
  sidebarHue.value = storedState.sidebarHue
  sidebarBrightness.value = storedState.sidebarBrightness
  hiddenStaticIds.value = storedState.hiddenStaticIds ?? []
  localMemoryItems.value = storedLocalItems.map((item) => ({
    ...item,
    note: {
      ...item.note,
      scale: item.note.scale ?? 1,
    },
  }))
  topZIndex.value = storedState.topZIndex
}

const activeNavItem = computed(
  () => navItems.find((item) => item.id === activePage.value) ?? navItems[0],
)

const memoryItems = computed<MemoryItem[]>(() => [
  ...localMemoryItems.value,
  ...staticMemoryItems.value.filter((item) => !hiddenStaticIds.value.includes(item.id)),
])

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
  [activePage, isCollapsed, sidebarHue, sidebarBrightness, localMemoryItems, hiddenStaticIds, topZIndex],
  () => {
    const state: StoredState = {
      activePage: activePage.value,
      isCollapsed: isCollapsed.value,
      sidebarHue: sidebarHue.value,
      sidebarBrightness: sidebarBrightness.value,
      localMemoryItems: serializeLocalMemoryItems(false),
      hiddenStaticIds: hiddenStaticIds.value,
      topZIndex: topZIndex.value,
    }

    saveStoredState(state)
  },
  { deep: true },
)

onMounted(() => {
  void loadStaticMemories()
  void restoreStoredLocalImages()
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

async function saveMemory() {
  const id = Date.now()
  const imageDataKey = selectedPhotoPreview.value ? `photo-${id}` : undefined
  const placement = [
    { x: 360, y: 36, rotate: '-2deg', color: '#e3ffd1', zIndex: topZIndex.value + 1, scale: 1 },
    { x: 580, y: 330, rotate: '4deg', color: '#fff0c4', zIndex: topZIndex.value + 1, scale: 1 },
    { x: 48, y: 520, rotate: '-5deg', color: '#d9e7ff', zIndex: topZIndex.value + 1, scale: 1 },
  ][memoryItems.value.length % 3]

  if (imageDataKey) {
    await saveImageData(imageDataKey, selectedPhotoPreview.value)
  }

  localMemoryItems.value = [
    {
      id,
      title: title.value,
      photoName: selectedPhotoName.value,
      markdownName: markdownFileName.value,
      situation: situation.value,
      imageUrl: selectedPhotoPreview.value || imageFallback,
      imageDataKey,
      githubPath: `memories/2026/${markdownFileName.value}`,
      note: placement,
    },
    ...localMemoryItems.value,
  ]
  activePage.value = 'gallery'
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

function bringToFront(item: MemoryItem) {
  topZIndex.value += 1
  item.note.zIndex = topZIndex.value
}

function resizeMemory(item: MemoryItem, amount: number) {
  bringToFront(item)
  item.note.scale = Math.min(Math.max(item.note.scale + amount, 0.7), 1.6)
}

function removeMemory(item: MemoryItem) {
  localMemoryItems.value = localMemoryItems.value.filter((memory) => memory.id !== item.id)

  if (item.imageDataKey) {
    void deleteImageData(item.imageDataKey)
  }

  if (staticMemoryItems.value.some((memory) => memory.id === item.id)) {
    hiddenStaticIds.value = [...new Set([...hiddenStaticIds.value, item.id])]
  }
}

function startDrag(event: PointerEvent, item: MemoryItem) {
  const board = stickyBoardRef.value
  const target = event.currentTarget as HTMLElement

  if (!board) return

  bringToFront(item)
  target.setPointerCapture(event.pointerId)
  activeDrag.value = {
    id: item.id,
    offsetX: event.clientX - item.note.x,
    offsetY: event.clientY - item.note.y,
  }
}

function moveDrag(event: PointerEvent) {
  const drag = activeDrag.value

  if (!drag) return

  const item =
    localMemoryItems.value.find((memory) => memory.id === drag.id) ??
    staticMemoryItems.value.find((memory) => memory.id === drag.id)

  if (!item) return

  moveMemoryWithinBoard(event, item, drag.offsetX, drag.offsetY)
}

function moveMemoryWithinBoard(
  event: PointerEvent,
  item: Pick<MemoryItem, 'note'>,
  offsetX: number,
  offsetY: number,
) {
  const board = stickyBoardRef.value

  if (!board) return

  const boardRect = board.getBoundingClientRect()
  const cardWidth = 330 * item.note.scale
  const cardHeight = 168 * item.note.scale
  const nextX = event.clientX - offsetX
  const nextY = event.clientY - offsetY

  item.note.x = Math.min(Math.max(nextX, 8), boardRect.width - cardWidth)
  item.note.y = Math.min(Math.max(nextY, 8), boardRect.height - cardHeight)
}

function stopDrag() {
  activeDrag.value = null
}

function resetStoredMemories() {
  void clearImageData()
  localStorage.removeItem(storageKey)
  localMemoryItems.value = []
  hiddenStaticIds.value = []
  staticMemoryItems.value = toMemoryItems(sampleItems)
  topZIndex.value = 10
}

function serializeLocalMemoryItems(stripAllDataUrls: boolean) {
  return localMemoryItems.value.map((item) => {
    if (!isDataUrl(item.imageUrl)) return item

    if (stripAllDataUrls || item.imageDataKey) {
      return {
        ...item,
        imageUrl: '',
      }
    }

    return item
  })
}

function saveStoredState(state: StoredState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...state,
        localMemoryItems: serializeLocalMemoryItems(true),
      }),
    )
  }
}

async function restoreStoredLocalImages() {
  let hasUpdates = false

  const restoredItems = await Promise.all(
    localMemoryItems.value.map(async (item) => {
      if (item.imageDataKey) {
        const storedImage = await loadImageData(item.imageDataKey)

        if (storedImage) {
          return {
            ...item,
            imageUrl: storedImage,
          }
        }

        if (!item.imageUrl) {
          return {
            ...item,
            imageUrl: imageFallback,
          }
        }

        return item
      }

      if (!isDataUrl(item.imageUrl)) return item

      const imageDataKey = `photo-${item.id}`
      await saveImageData(imageDataKey, item.imageUrl)
      hasUpdates = true

      return {
        ...item,
        imageDataKey,
      }
    }),
  )

  if (hasUpdates || restoredItems.some((item, index) => item.imageUrl !== localMemoryItems.value[index]?.imageUrl)) {
    localMemoryItems.value = restoredItems
  }
}

function isDataUrl(value: string) {
  return value.startsWith('data:')
}

function openImageDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(imageDbName, 1)

    request.addEventListener('upgradeneeded', () => {
      request.result.createObjectStore(imageStoreName)
    })
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })
}

async function withImageStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await openImageDb()

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(imageStoreName, mode)
    const request = action(transaction.objectStore(imageStoreName))

    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
    transaction.addEventListener('complete', () => db.close())
    transaction.addEventListener('error', () => {
      db.close()
      reject(transaction.error)
    })
  })
}

async function saveImageData(key: string, imageData: string) {
  try {
    await withImageStore('readwrite', (store) => store.put(imageData, key))
  } catch {
    // The gallery still works in the current session if browser storage is unavailable.
  }
}

async function loadImageData(key: string) {
  try {
    const imageData = await withImageStore<string | undefined>('readonly', (store) => store.get(key))

    return typeof imageData === 'string' ? imageData : ''
  } catch {
    return ''
  }
}

async function deleteImageData(key: string) {
  try {
    await withImageStore('readwrite', (store) => store.delete(key))
  } catch {
    // Best-effort cleanup only.
  }
}

async function clearImageData() {
  try {
    await withImageStore('readwrite', (store) => store.clear())
  } catch {
    // Best-effort cleanup only.
  }
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

          <form class="upload-form" @submit.prevent="saveMemory">
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
            <button class="primary-button" type="submit">建立 圖片 並加入展示</button>
          </form>
        </div>

        <div class="github-panel" aria-label="GitHub 上傳資訊">
          <div>
            <span class="section-label">GitHub-ready mapping</span>
            <h2>{{ selectedPhotoName }} ↔ {{ markdownFileName }}</h2>
            <p>建議路徑：photos/{{ selectedPhotoName }} 與 memories/2026/{{ markdownFileName }}</p>
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
          <button class="secondary-button" type="button" @click="resetStoredMemories">
            重設展示
          </button>
        </div>

        <div ref="stickyBoardRef" class="sticky-board">
          <article
            v-for="item in memoryItems"
            :key="item.id"
            class="sticky-memory"
            :class="{ 'is-dragging': activeDrag?.id === item.id }"
            :style="{
              top: `${item.note.y}px`,
              left: `${item.note.x}px`,
              rotate: item.note.rotate,
              scale: item.note.scale,
              '--note-color': item.note.color,
              zIndex: item.note.zIndex,
            }"
            @pointerdown="startDrag($event, item)"
            @pointermove="moveDrag"
            @pointerup="stopDrag"
            @pointercancel="stopDrag"
          >
            <div
              class="sticky-memory__photo"
              :style="photoStyle(item)"
            ></div>
            <div class="sticky-memory__note">
              <div class="sticky-memory__tools" aria-label="便利貼尺寸控制">
                <button
                  type="button"
                  aria-label="縮小便利貼"
                  title="縮小"
                  @pointerdown.stop
                  @click.stop="resizeMemory(item, -0.1)"
                >
                  -
                </button>
                <button
                  type="button"
                  aria-label="放大便利貼"
                  title="放大"
                  @pointerdown.stop
                  @click.stop="resizeMemory(item, 0.1)"
                >
                  +
                </button>
                <button
                  type="button"
                  aria-label="移除便利貼"
                  title="移除"
                  @pointerdown.stop
                  @click.stop="removeMemory(item)"
                >
                  ×
                </button>
              </div>
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
