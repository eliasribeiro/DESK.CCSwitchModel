import { app, BrowserWindow, ipcMain, dialog, shell, safeStorage } from 'electron'
import path from 'path'
import fs from 'fs'
import fsp from 'fs/promises'

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 800,
    minWidth: 900,
    minHeight: 700,
    titleBarStyle: 'hiddenInset', // Design moderno no macOS
    show: false,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })

  mainWindow.maximize()
  mainWindow.show()

  mainWindow.loadFile(path.join(app.getAppPath(), 'index.html'))
  
  // Garante que o app seja encerrado completamente quando a janela for fechada
  mainWindow.on('closed', () => {
    mainWindow = null
    app.quit()
    if (process.platform === 'win32') {
      app.exit(0)
    }
  })
  
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    console.log(`[renderer:${level}] ${message}`)
  })
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && String(input.key).toUpperCase() === 'F12') {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
      event.preventDefault()
    }
  })
  
  // Abrir links externos no navegador padrão
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.on('ready', createWindow)
app.on('window-all-closed', () => {
  app.quit()
  // Força o encerramento completo do processo no Windows
  if (process.platform === 'win32') {
    app.exit(0)
  }
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('select-root', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecione a pasta raiz do projeto',
    properties: ['openDirectory', 'createDirectory']
  })
  if (res.canceled || !res.filePaths?.[0]) return null
  return res.filePaths[0]
})

function isNonEmptyString(x) {
  return typeof x === 'string' && x.trim().length > 0
}

function providerEnv(provider, modelName, apiKey) {
  const env = {}
  // Configurações comuns de base
  if (provider === 'zai') {
    env.ANTHROPIC_BASE_URL = 'https://api.z.ai/api/anthropic'
    env.ANTHROPIC_AUTH_TOKEN = apiKey
    env.API_TIMEOUT_MS = '3000000'
  } else if (provider === 'minimax') {
    env.ANTHROPIC_BASE_URL = 'https://api.minimax.io/anthropic'
    env.ANTHROPIC_AUTH_TOKEN = apiKey
    env.API_TIMEOUT_MS = '3000000'
    env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = 1
  } else if (provider === 'openrouter') {
    env.ANTHROPIC_BASE_URL = 'https://openrouter.ai/api'
    env.ANTHROPIC_AUTH_TOKEN = apiKey
    env.ANTHROPIC_API_KEY = '' // recomendado para evitar conflitos
    env.API_TIMEOUT_MS = '3000000'
  } else if (provider === 'kimi') {
    env.ANTHROPIC_BASE_URL = 'https://api.moonshot.ai/anthropic'
    env.ANTHROPIC_AUTH_TOKEN = apiKey
    env.API_TIMEOUT_MS = '600000'
    env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1'
  } else if (provider === 'alibaba') {
    env.ANTHROPIC_BASE_URL = 'https://coding-intl.dashscope.aliyuncs.com/apps/anthropic'
    env.ANTHROPIC_AUTH_TOKEN = apiKey
    env.API_TIMEOUT_MS = '3000000'
  } else if (provider === 'piramyd') {
    env.OPENAI_BASE_URL = 'https://api.piramyd.cloud/v1'
    env.OPENAI_API_KEY = apiKey
    env.API_TIMEOUT_MS = '3000000'
  } else if (provider === 'cerebras') {
    env.ANTHROPIC_BASE_URL = 'https://api.cerebras.ai/v1'
    env.ANTHROPIC_AUTH_TOKEN = apiKey
    env.API_TIMEOUT_MS = '3000000'
  }

  // Mapeamento de modelos para garantir compatibilidade total com Claude Code
  const models = [
    "ANTHROPIC_MODEL",
    "ANTHROPIC_SMALL_FAST_MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL"
  ]
  models.forEach(m => env[m] = modelName)

  return { env }
}

function openCodeConfig(provider, modelName, apiKey, availableModels) {
  // Formato: provider_id/model_id
  const modelId = `${provider}/${modelName}`
  
  const config = {
    $schema: 'https://opencode.ai/config.json',
    model: modelId
  }
  
  // Para Piramyd, adicionar configuração completa com lista de modelos
  if (provider === 'piramyd') {
    config.provider = {
      piramyd: {
        npm: '@ai-sdk/openai-compatible',
        name: 'Piramyd Cloud',
        options: {
          baseURL: 'https://api.piramyd.cloud/v1',
          apiKey: apiKey,
          headers: {
            Authorization: `Bearer ${apiKey}`
          }
        },
        models: {}
      }
    }
    
    // Adicionar lista de modelos suportados
    if (availableModels && availableModels.length > 0) {
      availableModels.forEach(modelId => {
        config.provider.piramyd.models[modelId] = {
          name: modelId
        }
      })
    }
  }
  
  return config
}

ipcMain.handle('save-settings', async (_evt, payload) => {
  try {
    const { rootPath, cliType, provider, modelName, apiKey, availableModels } = payload || {}

    // Validações
    if (!isNonEmptyString(rootPath)) return { ok: false, error: 'Selecione uma pasta válida' }
    if (!['claude-code', 'opencode', 'opencode-go'].includes(cliType)) return { ok: false, error: 'Selecione um CLI válido' }
    if (!isNonEmptyString(modelName)) return { ok: false, error: 'Informe o nome do modelo' }
    if (!isNonEmptyString(apiKey)) return { ok: false, error: 'Informe a API Key' }

    // Validação de provedor baseada no CLI
    const validProviders = cliType === 'claude-code' 
      ? ['minimax', 'zai', 'openrouter', 'kimi', 'alibaba', 'piramyd', 'cerebras']
      : ['anthropic', 'openai', 'google', 'opencode', 'openrouter', 'minimax', 'zai', 'kimi', 'alibaba', 'piramyd', 'cerebras']
    
    if (!validProviders.includes(provider)) return { ok: false, error: 'Selecione um provedor válido' }

    // Verificar permissão de escrita
    await fsp.access(rootPath, fs.constants.W_OK).catch(() => {
      throw new Error(`Sem permissão de escrita em: ${rootPath}`)
    })

    if (cliType === 'opencode' || cliType === 'opencode-go') {
      // Configuração para OpenCode (opencode.json na raiz)
      const content = openCodeConfig(provider, modelName.trim(), apiKey.trim(), availableModels)
      const configPath = path.join(rootPath, 'opencode.json')
      
      await fsp.writeFile(configPath, JSON.stringify(content, null, 2), 'utf-8')
      
      return {
        ok: true,
        message: `Configuração aplicada com sucesso em opencode.json!`
      }
    } else {
      // Configuração para Claude Code (.claude/settings.json)
      const content = providerEnv(provider, modelName.trim(), apiKey.trim())
      const claudeDir = path.join(rootPath, '.claude')
      const settingsPath = path.join(claudeDir, 'settings.json')

      // Criar diretório e escrever arquivo
      await fsp.mkdir(claudeDir, { recursive: true })
      await fsp.writeFile(settingsPath, JSON.stringify(content, null, 2), 'utf-8')

      return {
        ok: true,
        message: `Configuração aplicada com sucesso em .claude/settings.json!`
      }
    }
  } catch (e) {
    return { ok: false, error: e?.message || 'Erro inesperado ao salvar as configurações' }
  }
})

ipcMain.handle('open-path', async (_evt, p) => {
  if (p && typeof p === 'string') {
    shell.openPath(p)
  }
})

function getCredentialsPath() {
  return path.join(app.getPath('userData'), 'credentials.json')
}

async function readCredentials() {
  const p = getCredentialsPath()
  try {
    const data = await fsp.readFile(p, 'utf-8')
    const obj = JSON.parse(data)
    if (!obj || typeof obj !== 'object') return { version: 1, providers: {} }
    if (!obj.providers || typeof obj.providers !== 'object') obj.providers = {}
    return obj
  } catch {
    return { version: 1, providers: {} }
  }
}

async function writeCredentials(obj) {
  const p = getCredentialsPath()
  const dir = path.dirname(p)
  await fsp.mkdir(dir, { recursive: true })
  await fsp.writeFile(p, JSON.stringify(obj, null, 2), 'utf-8')
}

ipcMain.handle('credential-set', async (_evt, payload) => {
  try {
    const { provider, apiKey } = payload || {}
    const allProviders = ['minimax', 'zai', 'openrouter', 'kimi', 'alibaba', 'piramyd', 'cerebras', 'anthropic', 'openai', 'google', 'opencode', 'opencode-go']
    if (!allProviders.includes(provider)) return { ok: false, error: 'provedor_invalido' }
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) return { ok: false, error: 'api_key_vazia' }
    const trimmed = apiKey.trim()
    const store = await readCredentials()
    const entry = { updatedAt: Date.now() }
    if (safeStorage.isEncryptionAvailable()) {
      const enc = safeStorage.encryptString(trimmed)
      entry.enc = enc.toString('base64')
      delete entry.plain
    } else {
      entry.plain = trimmed
      delete entry.enc
    }
    store.providers[provider] = entry
    await writeCredentials(store)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e?.message || 'erro_desconhecido' }
  }
})

ipcMain.handle('credential-get', async (_evt, provider) => {
  try {
    const allProviders = ['minimax', 'zai', 'openrouter', 'kimi', 'alibaba', 'piramyd', 'cerebras', 'anthropic', 'openai', 'google', 'opencode', 'opencode-go']
    if (!allProviders.includes(provider)) return { ok: false, error: 'provedor_invalido' }
    const store = await readCredentials()
    const entry = store.providers?.[provider]
    if (!entry || (typeof entry !== 'object')) return { ok: true, apiKey: '' }
    if (entry.enc && typeof entry.enc === 'string') {
      try {
        const buf = Buffer.from(entry.enc, 'base64')
        const plain = safeStorage.decryptString(buf)
        return { ok: true, apiKey: plain }
      } catch {
        delete store.providers[provider]
        await writeCredentials(store)
        return { ok: true, apiKey: '' }
      }
    }
    if (entry.plain && typeof entry.plain === 'string') {
      return { ok: true, apiKey: entry.plain }
    }
    return { ok: true, apiKey: '' }
  } catch (e) {
    return { ok: false, apiKey: '', error: e?.message || 'erro_desconhecido' }
  }
})
