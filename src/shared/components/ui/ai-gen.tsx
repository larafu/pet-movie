"use client"

import type React from "react"
import { useState, useRef } from "react"
import Image from "next/image"
import {
  Sparkles,
  Loader2,
  Play,
  Pause,
  Upload,
  Info,
  ChevronDown,
  ChevronUp,
  Heart,
  Film,
  History
} from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { Switch } from "@/shared/components/ui/switch"
import { Label } from "@/shared/components/ui/label"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs"
import { cn } from "@/shared/lib/utils"

interface GenerationSettings {
  aiModel: string
  prompt: string
  negativePrompt: string
  seed?: number
  steps?: number
  generateAudio: boolean
  videoLength: "5s" | "10s"
  outputCount: number
}

interface GalleryItem {
  id: string
  type: "image" | "video"
  url: string
  thumbnail?: string
  prompt: string
  author: {
    name: string
    avatar: string
  }
  likes: number
  timestamp: Date
  isLoading?: boolean
  progress?: number
  loadingText?: string
}

export { AIMultiModalGeneration }

function AIMultiModalGeneration() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<"my-generations" | "inspiration">("inspiration")
  
  const [settings, setSettings] = useState<GenerationSettings>({
    aiModel: "pet-movie-v2",
    prompt: "",
    negativePrompt: "",
    generateAudio: true,
    videoLength: "10s",
    outputCount: 1,
  })

  // Static Inspiration Items (Local Assets)
  const inspirationItems: GalleryItem[] = [
    {
      id: "ins-1",
      type: "video",
      url: "/video/dog-funny-family.mp4",
      thumbnail: "/imgs/dog-funny-family-poster.jpg", // Assuming poster exists or video will auto-poster
      prompt: "Golden Retriever family playing in the garden, sunny day, cinematic 4k",
      author: { name: "Sarah M.", avatar: "/imgs/avatars/1.png" },
      likes: 124,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    {
      id: "ins-2",
      type: "video",
      url: "/video/dogs-eye-contact.mp4",
      prompt: "Close up of a husky looking into the camera, emotional, detailed fur",
      author: { name: "Mike R.", avatar: "/imgs/avatars/2.png" },
      likes: 89,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
    },
    {
      id: "ins-3",
      type: "video",
      url: "/video/dogs-high-five.mp4",
      prompt: "Border collie doing a high five trick, slow motion, action shot",
      author: { name: "Jenny L.", avatar: "/imgs/avatars/3.png" },
      likes: 256,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
    },
    {
      id: "ins-4",
      type: "video",
      url: "/video/prairie-adventure.mp4",
      prompt: "Dog running through a wheat field at sunset, golden hour, epic music",
      author: { name: "Tom K.", avatar: "/imgs/avatars/4.png" },
      likes: 67,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96),
    },
  ]

  const [userItems, setUserItems] = useState<GalleryItem[]>([])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setActiveTab("my-generations") // Switch to user tab
    
    // Add a loading item
    const loadingId = Date.now().toString()
    const loadingItem: GalleryItem = {
      id: loadingId,
      type: "video",
      url: "",
      prompt: settings.prompt || "Generating video...",
      author: { name: "You", avatar: "/imgs/avatars/5.png" },
      likes: 0,
      timestamp: new Date(),
      isLoading: true,
      progress: 0,
      loadingText: "Initializing..."
    }
    
    setUserItems(prev => [loadingItem, ...prev])

    // Simulate generation process
    const steps = ["Analyzing image...", "Generating frames...", "Enhancing details...", "Finalizing video..."]
    
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, 200))
      
      setUserItems(prev => prev.map(item => {
        if (item.id === loadingId) {
          const stepIndex = Math.min(Math.floor((i / 100) * steps.length), steps.length - 1)
          return {
            ...item,
            progress: i,
            loadingText: steps[stepIndex]
          }
        }
        return item
      }))
    }

    // Finish generation
    setUserItems(prev => prev.map(item => {
      if (item.id === loadingId) {
        return {
          ...item,
          isLoading: false,
          url: "/video/dog-funny-family.mp4", // Mock result using local video
          thumbnail: uploadedImage || undefined
        }
      }
      return item
    }))
    
    setIsGenerating(false)
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT PANEL - Configuration */}
        <Card className="lg:col-span-4 border-border bg-zinc-900 shadow-lg h-fit">
          <CardContent className="px-4 py-0 space-y-3">
            <div>
              <h2 className="text-lg font-semibold mb-1">Image to Video AI</h2>
              <p className="text-xs text-muted-foreground">Transform your pet photos into cinematic movies</p>
            </div>

            <div className="space-y-4">
              {/* Model Selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Model</Label>
                <Select 
                  value={settings.aiModel} 
                  onValueChange={(val) => setSettings({...settings, aiModel: val})}
                >
                  <SelectTrigger className="w-full h-10 bg-background border-border/50 rounded-lg">
                    <div className="flex items-center gap-2 text-left">
                      <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">
                        PM
                      </div>
                      <div>
                        <SelectValue placeholder="Select Model" />
                      </div>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pet-movie-v2">Pet Movie v2.0</SelectItem>
                    <SelectItem value="memorial-v1">Memorial Tribute v1</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Image Upload */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Image</Label>
                <div 
                  className="relative group w-full aspect-[16/9] rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-background/50 transition-all cursor-pointer overflow-hidden"
                  onClick={() => document.getElementById('image-upload')?.click()}
                >
                  {uploadedImage ? (
                    <>
                      <Image 
                        src={uploadedImage} 
                        alt="Uploaded" 
                        fill 
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-xs font-medium">Click to change</p>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-xs font-medium text-foreground">Click to upload an image</p>
                        <p className="text-[10px] mt-0.5">JPG/PNG/WEBP up to 10MB</p>
                      </div>
                    </div>
                  )}
                  <input 
                    id="image-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              {/* Prompt Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prompt <span className="normal-case text-muted-foreground/60">(Optional)</span></Label>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="translate" className="text-[10px] text-muted-foreground cursor-pointer">Translate</Label>
                    <Switch id="translate" className="scale-75 origin-right" />
                  </div>
                </div>
                <div className="relative">
                  <Textarea 
                    placeholder="Describe the moment you want to create..."
                    className="min-h-[80px] bg-background border-border/50 rounded-lg resize-none p-3 text-xs focus-visible:ring-primary/50"
                    value={settings.prompt}
                    onChange={(e) => setSettings({...settings, prompt: e.target.value})}
                  />
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="absolute bottom-1 right-1 h-6 text-[10px] text-muted-foreground hover:text-primary px-2"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Enhance
                  </Button>
                </div>
              </div>

              {/* Settings Controls */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium">Generate Audio</Label>
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <Switch 
                    checked={settings.generateAudio}
                    onCheckedChange={(checked) => setSettings({...settings, generateAudio: checked})}
                    className="scale-90 origin-right"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Video Length</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(["5s", "10s"] as const).map((len) => (
                      <div 
                        key={len}
                        onClick={() => setSettings({...settings, videoLength: len})}
                        className={cn(
                          "flex items-center justify-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all",
                          settings.videoLength === len 
                            ? "border-primary bg-primary/10 text-primary" 
                            : "border-border/50 bg-background hover:bg-muted"
                        )}
                      >
                        <div className={cn(
                          "w-3 h-3 rounded-full border-2 flex items-center justify-center",
                          settings.videoLength === len ? "border-primary" : "border-muted-foreground"
                        )}>
                          {settings.videoLength === len && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </div>
                        <span className="text-xs font-medium">{len}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Output Video Number</Label>
                  </div>
                  <div className="flex p-1 bg-background border border-border/50 rounded-lg">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => setSettings({...settings, outputCount: num})}
                        className={cn(
                          "flex-1 py-1 text-xs font-medium rounded-md transition-all",
                          settings.outputCount === num 
                            ? "bg-primary/10 text-primary shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="pt-1">
                <button 
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Advanced</span>
                  {isAdvancedOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                
                {isAdvancedOpen && (
                  <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Negative Prompt</Label>
                      <Textarea 
                        placeholder="Elements to avoid..."
                        className="min-h-[50px] bg-background border-border/50 rounded-lg text-[10px]"
                        value={settings.negativePrompt}
                        onChange={(e) => setSettings({...settings, negativePrompt: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-muted-foreground">Seed</Label>
                      <input 
                        type="number" 
                        className="w-full h-8 px-2 bg-background border border-border/50 rounded-lg text-xs"
                        placeholder="-1 for random"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 mt-auto space-y-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Credits required:</span>
                </div>
                <span className="font-medium text-foreground">80 Credits</span>
              </div>
              
              <Button 
                className="w-full h-10 text-sm font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 rounded-xl"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Movie
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT PANEL - Gallery */}
        <Card className="lg:col-span-8 border-border bg-zinc-900 shadow-lg flex flex-col min-h-[600px]">
          <CardContent className="px-3 py-0 h-full flex flex-col">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full h-full flex flex-col">
              <div className="flex items-center justify-start mb-3">
                <TabsList className="bg-transparent border-0 p-0 h-8 gap-2">
                  <TabsTrigger value="inspiration" className="h-7 px-3 text-xs rounded-full border border-border/50 bg-background/10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all">
                    Inspiration
                  </TabsTrigger>
                  <TabsTrigger value="my-generations" className="h-7 px-3 text-xs rounded-full border border-border/50 bg-background/10 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary transition-all">
                    My Generations
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 rounded-2xl overflow-hidden">
                <TabsContent value="inspiration" className="mt-0 h-full">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 auto-rows-min">
                    {inspirationItems.map((item) => (
                      <GalleryCard key={item.id} item={item} />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="my-generations" className="mt-0 h-full">
                  {userItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-3 min-h-[300px]">
                      <div className="w-12 h-12 rounded-full bg-muted/10 flex items-center justify-center">
                        <Film className="w-6 h-6 opacity-50" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">No generations yet</p>
                        <p className="text-xs max-w-xs mx-auto mt-1">Create your first pet movie by uploading an image on the left.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 auto-rows-min">
                      {userItems.map((item) => (
                        <GalleryCard key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function GalleryCard({ item }: { item: GalleryItem }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const togglePlay = () => {
    if (!videoRef.current) return
    if (isPlaying) {
      videoRef.current.pause()
    } else {
      videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  if (item.isLoading) {
    return (
      <Card className="border-0 bg-background/50 overflow-hidden rounded-xl h-[280px] relative group">
        <CardContent className="p-0 h-full flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent" />
          
          <div className="relative z-10 flex flex-col items-center gap-4 p-4 text-center w-full">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div 
                className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" 
                style={{ animationDuration: '1.5s' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">{Math.round(item.progress || 0)}%</span>
              </div>
            </div>
            
            <div className="space-y-1 max-w-[150px]">
              <h3 className="text-xs font-medium text-foreground animate-pulse">{item.loadingText}</h3>
              <p className="text-[10px] text-muted-foreground">Creating...</p>
            </div>

            <div className="w-full max-w-[100px] h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 bg-background/50 overflow-hidden rounded-xl break-inside-avoid relative group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-0">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
          {item.type === 'video' ? (
            <>
              <video
                ref={videoRef}
                src={item.url}
                poster={item.thumbnail}
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                onEnded={() => setIsPlaying(false)}
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white ml-1" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <Image
              src={item.url}
              alt={item.prompt}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          )}

          {/* Overlay Info */}
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-100 transition-opacity">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20">
                  <Image 
                    src={item.author.avatar} 
                    alt={item.author.name} 
                    width={20} 
                    height={20} 
                  />
                </div>
                <span className="text-[10px] font-medium text-white/90">{item.author.name}</span>
              </div>
              
              <div className="flex items-center gap-1 text-white/90 bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
                <Heart className="w-2.5 h-2.5" />
                <span className="text-[10px]">{item.likes}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
