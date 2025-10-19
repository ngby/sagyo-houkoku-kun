'use client'

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
} from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ClipboardCopy, Clock, Play, Square } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const DURATION_PRESETS = [
  { label: "いまから15分", minutes: 15 },
  { label: "いまから30分", minutes: 30 },
  { label: "いまから45分", minutes: 45 },
  { label: "いまから1時間", minutes: 60 },
]


const MINIMUM_SLOT_MINUTES = 30

const formatDateForInput = (date: Date) => date.toISOString().split("T")[0]

const formatTimeForInput = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`

const parseDateTime = (dateString: string, timeString: string) => {
  if (!dateString || !timeString) return null
  return new Date(`${dateString}T${timeString}:00`)
}

const formatDateDisplay = (dateString: string) => {
  try {
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(`${dateString}T00:00:00`))
  } catch {
    return dateString
  }
}

const ensureBulletLine = (line: string) => {
    const trimmedStart = line.trimStart()

  if (!trimmedStart) {
    return "- "
  }

  if (trimmedStart.startsWith("- ")) {
    return `${line.slice(0, line.length - trimmedStart.length)}${trimmedStart}`
  }

  if (trimmedStart.startsWith("-")) {
    const indent = line.slice(0, line.length - trimmedStart.length)
    return `${indent}- ${trimmedStart.slice(1).trimStart()}`
  }

  const indent = line.slice(0, line.length - trimmedStart.length)
  return `${indent}- ${trimmedStart}`
}

const formatTaskBlock = (input: string) => {
  const rows = input
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .filter((line) => line.trim().length > 0)
    .map((line) => ensureBulletLine(line))

  return rows.length > 0 ? rows.join("\n") : "- "
}

export default function SlackTaskReporter() {
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [completedTasks, setCompletedTasks] = useState("")
  const [nextTasks, setNextTasks] = useState("")
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const now = new Date()
    const defaultStart = formatTimeForInput(now)
    const defaultEnd = new Date(now.getTime() + 60 * 60 * 1000)

    // 自動保存されたデータを復元
    const currentData = localStorage.getItem('sagyo-houkoku-current')
    if (currentData) {
      try {
        const data = JSON.parse(currentData)
        setStartTime(data.startTime || defaultStart)
        setEndTime(data.endTime || formatTimeForInput(defaultEnd))
        setCompletedTasks(data.completedTasks || "")
        setNextTasks(data.nextTasks || "")
      } catch (error) {
        console.error('自動保存データの読み込みに失敗しました:', error)
        setStartTime(defaultStart)
        setEndTime(formatTimeForInput(defaultEnd))
      }
    } else {
      setStartTime(defaultStart)
      setEndTime(formatTimeForInput(defaultEnd))
    }

  }, [])

  useEffect(() => {
    if (!startTime || !endTime) return

    const today = formatDateForInput(new Date())
    const start = parseDateTime(today, startTime)
    const end = parseDateTime(today, endTime)

    if (!start || !end) return

    if (end <= start) {
      const adjusted = new Date(start.getTime() + MINIMUM_SLOT_MINUTES * 60 * 1000)
      const formatted = formatTimeForInput(adjusted)

      if (formatted !== endTime) {
        setEndTime(formatted)
      }
    }
  }, [startTime, endTime])

  // 自動保存機能
  useEffect(() => {
    if (!startTime || !endTime) return

    const currentData = {
      startTime,
      endTime,
      completedTasks,
      nextTasks,
      lastSaved: new Date().toISOString()
    }

    try {
      localStorage.setItem('sagyo-houkoku-current', JSON.stringify(currentData))
    } catch (error) {
      console.error('自動保存に失敗しました:', error)
    }
  }, [startTime, endTime, completedTasks, nextTasks])

  const formattedRange = useMemo(() => {
    if (!startTime || !endTime) return ""
    const today = formatDateDisplay(formatDateForInput(new Date()))
    return `${today} ${startTime}〜${endTime}`
  }, [startTime, endTime])

  const setRangeFromNow = (durationMinutes: number) => {
    const now = new Date()
    const end = new Date(now.getTime() + durationMinutes * 60 * 1000)

    setStartTime(formatTimeForInput(now))
    setEndTime(formatTimeForInput(end))
  }

  const setStartToNow = () => {
    const now = new Date()
    setStartTime(formatTimeForInput(now))
  }

  const setEndByDuration = (minutes: number) => {
    const today = formatDateForInput(new Date())
    const base = parseDateTime(today, startTime)
    if (!base) return
    const next = new Date(base.getTime() + minutes * 60 * 1000)
    setEndTime(formatTimeForInput(next))
  }

  const setCurrentTimeAsStart = () => {
    const now = new Date()
    setStartTime(formatTimeForInput(now))
  }

  const setCurrentTimeAsEnd = () => {
    const now = new Date()
    setEndTime(formatTimeForInput(now))
  }

  const adjustTime = (time: string, minutes: number) => {
    const [hours, mins] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, mins + minutes)
    return formatTimeForInput(date)
  }

  const adjustStartTime = (minutes: number) => {
    const adjusted = adjustTime(startTime, minutes)
    setStartTime(adjusted)
  }

  const adjustEndTime = (minutes: number) => {
    const adjusted = adjustTime(endTime, minutes)
    setEndTime(adjusted)
  }

  const startTracking = () => {
    const now = new Date()
    setActualStartTime(formatTimeForInput(now))
    setIsTracking(true)
    toast({
      title: "作業開始",
      description: "時間追跡を開始しました。",
    })
  }

  const stopTracking = () => {
    const now = new Date()
    setActualEndTime(formatTimeForInput(now))
    setIsTracking(false)
    toast({
      title: "作業終了",
      description: "時間追跡を終了しました。",
    })
  }

  const startTimeEdit = () => {
    setEditStartTime(startTime)
    setEditEndTime(endTime)
    setIsEditingTime(true)
  }

  const saveTimeEdit = () => {
    setStartTime(editStartTime)
    setEndTime(editEndTime)
    setIsEditingTime(false)
    toast({
      title: "時間を更新しました",
      description: "時間が修正されました。",
    })
  }

  const cancelTimeEdit = () => {
    setIsEditingTime(false)
  }


  const generateMessage = useMemo(() => {
    const today = formatDateDisplay(formatDateForInput(new Date()))
    const timeRange = `${startTime}〜${endTime}`
    const actualTimeInfo = actualStartTime && actualEndTime ? `\n【実際の時間】${actualStartTime}〜${actualEndTime}` : ""
    
    // 作業中の時のみステータスを表示
    const statusInfo = isTracking ? " 🔄 作業中" : ""
    
    const message = `━━━━━━━━━━━━━━━━━━━━━━
📅 ${today}
⏰ ${timeRange}${statusInfo}${actualTimeInfo}
━━━━━━━━━━━━━━━━━━━━━━

【やったこと】
${formatTaskBlock(completedTasks)}

【次にやること】
${formatTaskBlock(nextTasks)}`
    return message
  }, [startTime, endTime, actualStartTime, actualEndTime, isTracking, completedTasks, nextTasks])

  const updateTasksAfterCopy = () => {
    // 「次にやること」を「やったこと」に移動
    setCompletedTasks(nextTasks)
    setNextTasks("")
    
    // 作業完了時の自動処理
    if (isTracking) {
      stopTracking()
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateMessage)
      toast({
        title: "コピーしました",
        description: "メッセージがクリップボードにコピーされました。タスクが更新されました。",
      })
      updateTasksAfterCopy()
    } catch (err) {
      console.error("コピーに失敗しました: ", err)
      toast({
        title: "エラー",
        description: "コピーに失敗しました。",
        variant: "destructive",
      })
    }
  }

  const handleTaskKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    value: string,
    setter: Dispatch<SetStateAction<string>>
  ) => {
    const textarea = event.currentTarget
    const { selectionStart, selectionEnd } = textarea

    const replaceLine = (lineStart: number, lineEnd: number, newLine: string) => {
      const before = value.slice(0, lineStart)
      const after = value.slice(lineEnd)
      setter(before + newLine + after)

      const hyphenIndex = newLine.indexOf("-")
      const cursor =
        hyphenIndex >= 0 ? Math.min(lineStart + hyphenIndex + 2, lineStart + newLine.length) : lineStart + newLine.length

      requestAnimationFrame(() => {
        textarea.selectionStart = cursor
        textarea.selectionEnd = cursor
      })
    }

    if (event.key === "Tab") {
      event.preventDefault()
      const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1
      const lineBreakIndex = value.indexOf("\n", selectionStart)
      const lineEnd = lineBreakIndex === -1 ? value.length : lineBreakIndex
      const line = value.slice(lineStart, lineEnd)

      const indentLength = Math.max(0, (line.match(/^ +/)?.[0]?.length ?? 0) + (event.shiftKey ? -2 : 2))
      const indent = " ".repeat(indentLength)
      const updatedLine = indent + ensureBulletLine(line.trimStart())
      replaceLine(lineStart, lineEnd, updatedLine)
      return
    }

  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-center">作業報告くん</h1>

      <section className="space-y-3 rounded-md border border-gray-200 p-3 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">時間</span>
            {formattedRange && <span className="text-xs text-muted-foreground">{formattedRange}</span>}
          </div>


          {isEditingTime ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-muted-foreground">開始</span>
                <Input
                  type="time"
                  className="flex-1"
                  value={editStartTime}
                  onChange={(event) => setEditStartTime(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-muted-foreground">終了</span>
                <Input
                  type="time"
                  className="flex-1"
                  value={editEndTime}
                  onChange={(event) => setEditEndTime(event.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveTimeEdit}>
                  保存
                </Button>
                <Button variant="outline" size="sm" onClick={cancelTimeEdit}>
                  キャンセル
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-muted-foreground">開始</span>
                <Input
                  type="time"
                  className="flex-1"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
                <Button variant="outline" size="sm" onClick={setCurrentTimeAsStart}>
                  <Clock className="h-4 w-4" />
                </Button>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustStartTime(-30)}
                    className="text-xs px-2"
                  >
                    -30分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustStartTime(-15)}
                    className="text-xs px-2"
                  >
                    -15分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustStartTime(-5)}
                    className="text-xs px-2"
                  >
                    -5分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustStartTime(5)}
                    className="text-xs px-2"
                  >
                    +5分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustStartTime(15)}
                    className="text-xs px-2"
                  >
                    +15分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustStartTime(30)}
                    className="text-xs px-2"
                  >
                    +30分
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-muted-foreground">終了</span>
                <Input
                  type="time"
                  className="flex-1"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
                <Button variant="outline" size="sm" onClick={setCurrentTimeAsEnd}>
                  <Clock className="h-4 w-4" />
                </Button>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustEndTime(-30)}
                    className="text-xs px-2"
                  >
                    -30分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustEndTime(-15)}
                    className="text-xs px-2"
                  >
                    -15分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustEndTime(-5)}
                    className="text-xs px-2"
                  >
                    -5分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustEndTime(5)}
                    className="text-xs px-2"
                  >
                    +5分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustEndTime(15)}
                    className="text-xs px-2"
                  >
                    +15分
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => adjustEndTime(30)}
                    className="text-xs px-2"
                  >
                    +30分
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((preset) => (
            <Button key={preset.minutes} size="sm" variant="secondary" onClick={() => setRangeFromNow(preset.minutes)}>
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant={isTracking ? "destructive" : "default"}
            size="sm"
            onClick={isTracking ? stopTracking : startTracking}
          >
            {isTracking ? (
              <>
                <Square className="h-4 w-4 mr-1" />
                作業終了
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                作業開始
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={startTimeEdit}>
            時間を編集
          </Button>
        </div>

        {actualStartTime && actualEndTime && (
          <div className="text-xs text-muted-foreground">
            実際の時間: {actualStartTime}〜{actualEndTime}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">やったこと</label>
          <Textarea
            placeholder="やったことを入力してください"
            value={completedTasks}
            onChange={(event) => setCompletedTasks(event.target.value)}
            onKeyDown={(event) => handleTaskKeyDown(event, completedTasks, setCompletedTasks)}
            className="min-h-32"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">次にやること</label>
          <Textarea
            placeholder="次にやることを入力してください"
            value={nextTasks}
            onChange={(event) => setNextTasks(event.target.value)}
            onKeyDown={(event) => handleTaskKeyDown(event, nextTasks, setNextTasks)}
            className="min-h-32"
          />
        </div>
      </div>


      <div className="relative mt-4 rounded-md bg-gray-100 p-6">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed">{generateMessage}</pre>
        <Button
          onClick={copyToClipboard}
          className="absolute top-2 right-2"
          size="icon"
          variant="ghost"
          title="コピーして次のタスクを更新"
        >
          <ClipboardCopy className="h-4 w-4" />
        </Button>
      </div>


      <p className="text-center text-sm text-muted-foreground">
        コピー後、「次にやること」は「やったこと」に移動します。
      </p>
    </div>
  )
}
