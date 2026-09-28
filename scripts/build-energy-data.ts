import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type DatasetId, DatasetIdSchema } from '../src/domain/energy/schema'
import { parseEnergyCsv } from './parse-energy-csv'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const output = resolve(root, 'src/generated/energy')
const datasetIds = DatasetIdSchema.options
const artifacts = []
for (const household of datasetIds) {
  const bytes = await readFile(
    resolve(root, `data/raw/${household}-interval-data.csv`),
  )
  artifacts.push(parseEnergyCsv(bytes, household))
}

// Validate every source before publishing any generated manifest.
await mkdir(output, { recursive: true })
async function writeIfChanged(path: string, content: string) {
  if ((await readFile(path, 'utf8').catch(() => '')) === content) return
  const temporary = `${path}.tmp`
  await writeFile(temporary, content)
  await rename(temporary, path)
}
const manifest: Partial<
  Record<
    DatasetId,
    { dataVersion: string; coverage: { start: string; end: string } }
  >
> = {}
const imports = [
  "import '@tanstack/react-start/server-only'",
  "import type { DatasetId, EnergyArtifact } from '../../domain/energy/schema'",
]
for (const [index, artifact] of artifacts.entries()) {
  const filename = `${artifact.household}.${artifact.dataVersion}.json`
  await writeIfChanged(
    resolve(output, filename),
    `${JSON.stringify(artifact)}\n`,
  )
  imports.push(`import dataset${index} from './${filename}'`)
  manifest[artifact.household] = {
    dataVersion: artifact.dataVersion,
    coverage: artifact.coverage,
  }
}
imports.push(
  `export const energyRegistry: Record<DatasetId, EnergyArtifact> = {\n${artifacts.map((artifact, index) => `  '${artifact.household}': { ...dataset${index}, household: '${artifact.household}' }`).join(',\n')}\n}\n`,
)
await writeIfChanged(
  resolve(output, 'registry.server.ts'),
  `${imports.join('\n')}\n`,
)
await writeIfChanged(
  resolve(root, 'src/generated/data-versions.ts'),
  `// Generated from source bytes; contains no measurements.\nexport const DATA_VERSIONS = ${JSON.stringify(manifest, null, 2)} as const\n`,
)
const currentFiles = new Set(
  artifacts.map(
    (artifact) => `${artifact.household}.${artifact.dataVersion}.json`,
  ),
)
for (const filename of await readdir(output))
  if (filename.endsWith('.json') && !currentFiles.has(filename))
    await rm(resolve(output, filename))
console.log(
  `Validated ${artifacts.reduce((sum, artifact) => sum + artifact.intervalCount, 0).toLocaleString('en-US')} intervals across ${artifacts.length} households.`,
)
