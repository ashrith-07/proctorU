// Takes a screenshot of the primary display in the main process (no renderer stream needed).
const { desktopCapturer, screen } = require('electron');

// Returns a JPEG Buffer, or throws if the OS blocks screen capture
async function captureJpeg() {
  const { size, scaleFactor } = screen.getPrimaryDisplay();
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(size.width * scaleFactor),
      height: Math.round(size.height * scaleFactor),
    },
  });
  const image = sources[0]?.thumbnail;
  // Without permission macOS returns an empty image
  if (!image || image.isEmpty()) throw new Error('Screen capture is not permitted');
  return image.toJPEG(80);
}

module.exports = { captureJpeg };
