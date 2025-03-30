import { useState, ChangeEvent, useEffect } from 'react'
import Editor, { Monaco } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import './App.css'

// Map file extensions to Monaco language IDs and display names
const languageConfig: { [key: string]: { id: string, display: string } } = {
  js: { id: 'javascript', display: 'JavaScript' },
  jsx: { id: 'javascript', display: 'JavaScript (JSX)' },
  ts: { id: 'typescript', display: 'TypeScript' },
  tsx: { id: 'typescript', display: 'TypeScript (TSX)' },
  html: { id: 'html', display: 'HTML' },
  css: { id: 'css', display: 'CSS' },
  py: { id: 'python', display: 'Python' },
  java: { id: 'java', display: 'Java' },
  cpp: { id: 'cpp', display: 'C++' },
  c: { id: 'c', display: 'C' },
  cs: { id: 'csharp', display: 'C#' },
  kt: { id: 'kotlin', display: 'Kotlin' },
  go: { id: 'go', display: 'Go' },
  rs: { id: 'rust', display: 'Rust' },
  rb: { id: 'ruby', display: 'Ruby' },
  php: { id: 'php', display: 'PHP' },
  swift: { id: 'swift', display: 'Swift' }
}

function App() {
  const [inputCode, setInputCode] = useState('')
  const [outputCode, setOutputCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editorInstance, setEditorInstance] = useState<monaco.editor.IStandaloneCodeEditor | null>(null)
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [isLiveFormatting, setIsLiveFormatting] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Update theme in localStorage when it changes
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
    // Update document theme
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(null)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  // Register formatter for each language
  useEffect(() => {
    if (monacoInstance) {
      Object.values(languageConfig).forEach(({ id }) => {
        monacoInstance.languages.registerDocumentFormattingEditProvider(id, {
          async provideDocumentFormattingEdits(model) {
            // Basic formatting rules
            return [
              {
                range: model.getFullModelRange(),
                text: formatText(model.getValue())
              }
            ]
          }
        })
      })
    }
  }, [monacoInstance])

  // Add debounced live formatting
  useEffect(() => {
    if (isLiveFormatting && inputCode.trim()) {
      const timeoutId = setTimeout(() => {
        const formatted = formatText(inputCode)
        setOutputCode(formatted)
      }, 500) // 500ms delay to avoid too frequent updates

      return () => clearTimeout(timeoutId)
    }
  }, [inputCode, isLiveFormatting])

  const formatText = (text: string): string => {
    try {
      // Basic formatting for demonstration
      // You can add more sophisticated formatting logic here
      let formatted = text.trim()

      // Remove multiple blank lines
      formatted = formatted.replace(/\n\s*\n\s*\n/g, '\n\n')

      // Ensure consistent indentation
      const lines = formatted.split('\n')
      let indentLevel = 0
      const indentSize = 4
      const formattedLines = lines.map(line => {
        const trimmedLine = line.trim()
        
        // Decrease indent for closing brackets/braces
        if (trimmedLine.match(/^[}\])]/) && indentLevel > 0) {
          indentLevel--
        }

        // Add current indentation
        const indentedLine = ' '.repeat(indentLevel * indentSize) + trimmedLine

        // Increase indent for opening brackets/braces
        if (trimmedLine.match(/[{[(]$/)) {
          indentLevel++
        }

        return indentedLine
      })

      return formattedLines.join('\n')
    } catch (err) {
      console.error('Error in basic formatting:', err)
      return text // Return original text if formatting fails
    }
  }

  const handleInputChange = (value: string | undefined) => {
    const newValue = value || ''
    setInputCode(newValue)
    
    // Clear output if input is empty
    if (!newValue.trim()) {
      setOutputCode('')
    }
  }

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value)
    setError(null)
  }

  const getFileExtension = (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase()
  }

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setError(null)

    if (!file) return

    const extension = getFileExtension(file.name)
    const languageEntry = languageConfig[extension]

    if (!languageEntry) {
      setError(`Unsupported file type: .${extension}`)
      e.target.value = '' // Reset file input
      return
    }

    // Update the language before loading the file
    setLanguage(languageEntry.id)
    setFileName(file.name)

    // Read and set the file content
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setInputCode(content)
      // Format immediately if live formatting is enabled
      if (isLiveFormatting) {
        const formatted = formatText(content)
        setOutputCode(formatted)
      }
    }
    reader.onerror = () => {
      setError('Error reading file')
      e.target.value = '' // Reset file input
    }
    reader.readAsText(file)
  }

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) => {
    setEditorInstance(editor)
    setMonacoInstance(monaco)
  }

  const formatCode = async () => {
    if (!editorInstance || !monacoInstance) {
      setError('Editor not initialized')
      return
    }

    try {
      if (!inputCode.trim()) {
        setError('No code to format')
        return
      }

      // Apply formatting and update output
      const formatted = formatText(inputCode)
      setOutputCode(formatted)
      setError(null)
    } catch (err) {
      setError('Error formatting code')
      console.error('Formatting error:', err)
    }
  }

  const handleLiveFormattingToggle = (e: ChangeEvent<HTMLInputElement>) => {
    setIsLiveFormatting(e.target.checked)
    if (e.target.checked && inputCode.trim()) {
      // Format immediately when enabling live formatting
      const formatted = formatText(inputCode)
      setOutputCode(formatted)
    }
  }

  const handleThemeToggle = (e: ChangeEvent<HTMLInputElement>) => {
    setIsDarkMode(e.target.checked)
  }

  const copyToClipboard = async () => {
    if (!outputCode) {
      setError('No formatted code to copy')
      return
    }

    try {
      await navigator.clipboard.writeText(outputCode)
      setSuccess('Code copied to clipboard!')
      setError(null)
    } catch (err) {
      setError('Failed to copy code')
      console.error('Copy error:', err)
    }
  }

  const downloadFormattedCode = () => {
    if (!outputCode) {
      setError('No formatted code to download')
      return
    }

    try {
      const blob = new Blob([outputCode], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Generate download filename
      const downloadName = fileName 
        ? `formatted_${fileName}` 
        : `formatted_code.${Object.entries(languageConfig).find(([_, { id }]) => id === language)?.[0] || 'txt'}`
      
      a.download = downloadName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setSuccess('Code downloaded successfully!')
      setError(null)
    } catch (err) {
      setError('Failed to download code')
      console.error('Download error:', err)
    }
  }

  // Generate accept string for file input
  const acceptedFileTypes = Object.keys(languageConfig).map(ext => `.${ext}`).join(',')

  return (
    <div className={`app-container ${isDarkMode ? 'dark' : 'light'}`}>
      <header>
        <h1>Code Formatter</h1>
        <div className="controls">
          <select value={language} onChange={handleLanguageChange}>
            {Object.entries(languageConfig).map(([ext, { id, display }]) => (
              <option key={ext} value={id}>
                {display}
              </option>
            ))}
          </select>
          <div className="file-upload">
            <label htmlFor="file-input">Upload File</label>
            <input
              type="file"
              id="file-input"
              onChange={handleFileUpload}
              accept={acceptedFileTypes}
            />
          </div>
          <div className="live-format-toggle">
            <label>
              <input
                type="checkbox"
                checked={isLiveFormatting}
                onChange={handleLiveFormattingToggle}
              />
              <span className="toggle-label">Live Formatting</span>
            </label>
          </div>
          <div className="theme-toggle">
            <label>
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={handleThemeToggle}
              />
              <span className="toggle-label">
                {isDarkMode ? '🌙 Dark' : '☀️ Light'}
              </span>
            </label>
          </div>
          <button 
            className="format-button" 
            onClick={formatCode}
            disabled={isLiveFormatting}
          >
            Format Code
          </button>
        </div>
        {outputCode && (
          <div className="output-controls">
            <button 
              className="copy-button" 
              onClick={copyToClipboard}
            >
              Copy to Clipboard
            </button>
            <button 
              className="download-button" 
              onClick={downloadFormattedCode}
            >
              Download Formatted Code
            </button>
          </div>
        )}
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </header>
      <main>
        <div className="editor-container">
          <div className="editor input-editor">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              language={language}
              value={inputCode}
              onChange={handleInputChange}
              onMount={handleEditorDidMount}
              theme={isDarkMode ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                tabSize: 4,
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </div>
          <div className="editor output-editor">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              language={language}
              value={outputCode}
              theme={isDarkMode ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                readOnly: true,
                automaticLayout: true,
                tabSize: 4,
              }}
            />
          </div>
        </div>
      </main>
      <footer>
        <p>© 2025 Samir Dubey. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
