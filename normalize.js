const {
  spawn
} = require('child_process')
const {
  basename,
  extname
} = require('path')

const filename = process.argv[2]

console.log(`Normalizing ${filename}...`)

analyze().then(normalize).catch(err => {
  console.error(err)
})

function analyze() {
  return new Promise((resolve, reject) => {
    const args = ['-i', filename, '-af', 'loudnorm=I=-23:LRA=7:tp=-2:print_format=json', '-f', 'null', '-']

    console.log('ffmpeg', args.join(' '))

    const process = spawn('ffmpeg', args)

    let analyzeOutput = null

    process.stderr.on('data', (data) => {
      const dataStr = data.toString()

      console.log(`${dataStr}`);

      const hasOutput = dataStr.indexOf('{') > -1

      if (hasOutput) {
        analyzeOutput = dataStr.substring(dataStr.indexOf('{'), dataStr.indexOf('}') + 1)
        analyzeOutput = JSON.parse(analyzeOutput)
      }
    });

    process.on('close', (code) => {
      console.log(`Finished with code: ${code}`)

      if (code > 0) {
        reject(new Error('Analyze finished with non-zero exit code'))
      } else {
        resolve(analyzeOutput)
      }
    });
  })
}

function normalize(analyzeOutput) {
  return new Promise((resolve, reject) => {
    const {
      input_i,
      input_tp,
      input_lra,
      input_thresh,
      target_offset
    } = analyzeOutput
    const normStr = `loudnorm=I=-23:LRA=7:tp=-2:measured_I=${input_i}:measured_LRA=${input_lra}:measured_tp=${input_tp}:measured_thresh=${input_thresh}:offset=${target_offset}:linear=true`
    const fileStr = basename(filename, extname(filename))
    const args = ['-y', '-i', filename, '-af', normStr, '-vcodec', 'copy', '-acodec', 'aac', '-ar', '48k', '-b:a', '312k', `${fileStr}.norm.mp4`]

    console.log('ffmpeg', args.join(' '))

    const process = spawn('ffmpeg', args)

    process.stderr.on('data', (data) => {
      console.log(data.toString());
    });

    process.on('close', (code) => {
      console.log(`Finished with code: ${code}`);

      if (code > 0) {
        reject(new Error('Normalize finished with non-zero exit code'))
      } else {
        resolve()
      }
    });
  })
}
