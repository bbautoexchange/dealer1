import { useEffect, useState } from 'react'

type Gallery = { images: string[]; index: number; label: string }

function galleryFromMainImage(main: Element): Gallery | null {
  const gallery = main.closest('.gallery')
  const mainImage = main.querySelector('img')
  if (!gallery || !mainImage) return null

  const images = Array.from(gallery.querySelectorAll<HTMLImageElement>('.thumbnails img')).map((image) => image.currentSrc || image.src).filter(Boolean)
  const activeThumbnail = gallery.querySelector<HTMLImageElement>('.thumbnails button.selected img')
  const activeImage = mainImage.currentSrc || mainImage.src
  if (!images.length) images.push(activeImage)
  const selectedIndex = activeThumbnail ? images.indexOf(activeThumbnail.currentSrc || activeThumbnail.src) : images.indexOf(activeImage)
  return { images, index: selectedIndex >= 0 ? selectedIndex : 0, label: mainImage.alt }
}

export default function VehicleLightbox() {
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    const open = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      const mainImage = event.target.closest('.main-image')
      if (!mainImage) return
      const nextGallery = galleryFromMainImage(mainImage)
      if (!nextGallery) return
      setZoomed(false)
      setGallery(nextGallery)
    }
    document.addEventListener('click', open)
    return () => document.removeEventListener('click', open)
  }, [])

  useEffect(() => {
    if (!gallery) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGallery(null)
      if (event.key === 'ArrowLeft') setGallery((current) => current ? { ...current, index: (current.index - 1 + current.images.length) % current.images.length } : null)
      if (event.key === 'ArrowRight') setGallery((current) => current ? { ...current, index: (current.index + 1) % current.images.length } : null)
      if (event.key === '+' || event.key === '=') setZoomed(true)
      if (event.key === '-') setZoomed(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', handleKey) }
  }, [gallery])

  if (!gallery) return null
  const previous = () => { setZoomed(false); setGallery((current) => current ? { ...current, index: (current.index - 1 + current.images.length) % current.images.length } : null) }
  const next = () => { setZoomed(false); setGallery((current) => current ? { ...current, index: (current.index + 1) % current.images.length } : null) }
  let touchStart = 0

  return <div className="vehicle-lightbox" role="dialog" aria-modal="true" aria-label="Vehicle photo gallery" onClick={(event) => { if (event.target === event.currentTarget) setGallery(null) }}>
    <div className="vehicle-lightbox-top"><span>{gallery.index + 1} / {gallery.images.length}</span><div><button onClick={() => setZoomed((value) => !value)}>{zoomed ? 'Zoom out' : 'Zoom in'}</button><button onClick={() => setGallery(null)} aria-label="Close photo gallery">Close ×</button></div></div>
    {gallery.images.length > 1 && <button className="vehicle-lightbox-arrow previous" onClick={previous} aria-label="Previous photo">←</button>}
    <div className="vehicle-lightbox-media" onTouchStart={(event) => { touchStart = event.changedTouches[0]?.clientX ?? 0 }} onTouchEnd={(event) => { const difference = (event.changedTouches[0]?.clientX ?? 0) - touchStart; if (Math.abs(difference) > 45) difference > 0 ? previous() : next() }}>
      <img className={zoomed ? 'zoomed' : ''} src={gallery.images[gallery.index]} alt={gallery.label} onClick={() => setZoomed((value) => !value)} />
    </div>
    {gallery.images.length > 1 && <button className="vehicle-lightbox-arrow next" onClick={next} aria-label="Next photo">→</button>}
    <p>Click the image to zoom · Use arrows or swipe to browse</p>
  </div>
}
