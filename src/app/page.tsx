'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ClipboardCopy } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

export default function SlackTaskReporter() {
    const [timeRange, setTimeRange] = useState('')
    const [completedTasks, setCompletedTasks] = useState('')
    const [nextTasks, setNextTasks] = useState('')
    const [generatedMessage, setGeneratedMessage] = useState('')
    const { toast } = useToast()

    useEffect(() => {
        // Set default time range from current time to 1 hour later
        const now = new Date()
        const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        const endTime = new Date(now.getTime() + 60 * 60 * 1000)
        const endTimeString = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`
        setTimeRange(`${startTime}〜${endTimeString}`)
    }, [])

    const generateMessage = () => {
        const message = `${timeRange}
【やったこと】
- ${completedTasks}
【次にやること】
- ${nextTasks}`
        setGeneratedMessage(message)
    }

    const updateTasksAfterCopy = () => {
        setCompletedTasks(prevCompleted => {
            const newCompleted = prevCompleted ? `${prevCompleted}\n${nextTasks}` : nextTasks
            return newCompleted.trim()
        })
        setNextTasks('')
    }

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedMessage)
            toast({
                title: "コピーしました",
                description: "メッセージがクリップボードにコピーされました。タスクが更新されました。",
            })
            updateTasksAfterCopy()
        } catch (err) {
            console.error('コピーに失敗しました: ', err)
            toast({
                title: "エラー",
                description: "コピーに失敗しました。",
                variant: "destructive",
            })
        }
    }

    return (
        <div className="max-w-md mx-auto p-6 space-y-4">
            <h1 className="text-2xl font-bold text-center">Slack タスクレポーター</h1>
            <Input
                placeholder="時間範囲 (例: 14:50〜15:20)"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
            />
            <Textarea
                placeholder="やったこと"
                value={completedTasks}
                onChange={(e) => setCompletedTasks(e.target.value)}
            />
            <Textarea
                placeholder="次にやること"
                value={nextTasks}
                onChange={(e) => setNextTasks(e.target.value)}
            />
            <Button onClick={generateMessage} className="w-full">メッセージを生成</Button>
            {generatedMessage && (
                <div className="mt-4 p-4 bg-gray-100 rounded-md relative">
                    <pre className="whitespace-pre-wrap">{generatedMessage}</pre>
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
            )}
            <p className="text-sm text-muted-foreground text-center">
                コピー後、「次にやること」は「やったこと」に移動します。
            </p>
        </div>
    )
}
