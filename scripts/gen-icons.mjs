import sharp from 'sharp'

const SRC = 'public/icon.svg'

await sharp(SRC).resize(192, 192).png().toFile('public/icon-192.png')
await sharp(SRC).resize(512, 512).png().toFile('public/icon-512.png')

const maskable = await sharp(SRC)
  .resize(358, 358)
  .png()
  .toBuffer()
await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 134, g: 59, b: 255, alpha: 1 } },
})
  .composite([{ input: maskable, gravity: 'center' }])
  .png()
  .toFile('public/maskable-512.png')

console.log('icons generated')
