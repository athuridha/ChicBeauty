import { useEffect, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { toast } from 'sonner'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { BeforeAfterPhoto, Booking } from '@/shared/types'

interface Props {
  booking: Booking
  onClose: () => void
  onUploaded?: (photo: BeforeAfterPhoto) => void
}

export default function PhotoUploadPanel({ booking, onClose, onUploaded }: Props) {
  const [photos, setPhotos] = useState<BeforeAfterPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [caption, setCaption] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api.photos.list(booking.id).then(setPhotos).catch(() => {})
  }, [booking.id])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const photo = await api.photos.upload(booking.id, file, caption || undefined)
      setPhotos((prev) => [...prev, photo])
      onUploaded?.(photo)
      setCaption('')
      if (fileRef.current) fileRef.current.value = ''
      toast.success('Foto berhasil diupload')
    } catch (err) {
      toast.error('Gagal upload foto', {
        description: err instanceof Error ? err.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.photos.remove(id)
      setPhotos((prev) => prev.filter((p) => p.id !== id))
      toast.success('Foto dihapus')
    } catch (err) {
      toast.error('Gagal hapus foto', {
        description: err instanceof Error ? err.message : undefined,
      })
    }
  }

  const canUpload = photos.length < 2

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Foto Before/After</DialogTitle>
          <DialogDescription>
            Booking #{booking.id} · {booking.service_package} · Maks 2 foto
          </DialogDescription>
        </DialogHeader>

        {photos.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada foto.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="space-y-1">
                <div className="group relative">
                  <img
                    src={p.file_path}
                    alt={p.caption ?? 'Foto treatment'}
                    className="aspect-square w-full rounded-md object-cover"
                  />
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label="Hapus"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {p.caption && (
                  <p className="text-xs text-muted-foreground truncate">
                    {p.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {canUpload ? (
          <div className="space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="caption">Caption (opsional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="misal: before treatment"
              />
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 hover:bg-accent/30">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">
                {loading ? 'Uploading…' : 'Klik untuk pilih foto'}
              </p>
              <p className="text-xs text-muted-foreground">
                JPG/PNG, maks 5MB · {photos.length}/2 terpakai
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleUpload}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            Sudah mencapai batas 2 foto.
          </p>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Selesai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
