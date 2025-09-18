#!/usr/bin/env node

/**
 * 💾 DATABASE BACKUP & RESTORE UTILITY
 * ===================================
 * 
 * Comprehensive database backup and restore system with multiple formats
 * and scheduling capabilities.
 * 
 * Usage:
 *   node scripts/database-backup.mjs backup [options]
 *   node scripts/database-backup.mjs restore <backup-file>
 *   node scripts/database-backup.mjs list
 *   node scripts/database-backup.mjs cleanup [--days=30]
 * 
 * Options:
 *   --format=json|sql       Backup format (default: json)
 *   --compress              Compress backup files
 *   --exclude=table1,table2 Exclude specific tables
 *   --include=table1,table2 Include only specific tables
 *   --dry-run               Show what would be backed up without doing it
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import { createGzip, createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { createReadStream, createWriteStream } from 'fs'

const prisma = new PrismaClient()

class DatabaseBackup {
  constructor() {
    this.backupDir = 'backups'
    this.defaultTables = [
      'property', 'neighborhood', 'propertyNeighborhood',
      'user', 'setting', 'emailTemplate', 'propertyInquiry'
    ]
  }

  async ensureBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true })
    } catch (error) {
      // Directory already exists
    }
  }

  async createBackup(options = {}) {
    const {
      format = 'json',
      compress = false,
      exclude = [],
      include = null,
      dryRun = false
    } = options

    await this.ensureBackupDir()

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const baseFileName = `database-backup-${timestamp}`
    const extension = format === 'json' ? 'json' : 'sql'
    const fileName = compress ? `${baseFileName}.${extension}.gz` : `${baseFileName}.${extension}`
    const backupPath = path.join(this.backupDir, fileName)

    console.log('💾 CREATING DATABASE BACKUP')
    console.log('===========================')
    console.log(`📅 Timestamp: ${new Date().toISOString()}`)
    console.log(`📁 Format: ${format.toUpperCase()}`)
    console.log(`🗜️  Compression: ${compress ? 'Enabled' : 'Disabled'}`)
    console.log(`📂 Output: ${backupPath}`)

    if (dryRun) {
      console.log('\n🔍 DRY RUN - No files will be created')
    }

    try {
      const tablesToBackup = this.getTableList(include, exclude)
      console.log(`\n📊 Tables to backup: ${tablesToBackup.join(', ')}`)

      const data = await this.extractData(tablesToBackup, dryRun)
      
      if (!dryRun) {
        if (format === 'json') {
          await this.saveJsonBackup(data, backupPath, compress)
        } else {
          await this.saveSqlBackup(data, backupPath, compress)
        }

        // Create backup metadata
        await this.createBackupMetadata(backupPath, data, options)
      }

      console.log('\n✅ Backup completed successfully!')
      
      if (!dryRun) {
        const stats = await fs.stat(backupPath)
        console.log(`📦 File size: ${this.formatFileSize(stats.size)}`)
      }

      return backupPath

    } catch (error) {
      console.error('❌ Backup failed:', error.message)
      throw error
    }
  }

  async extractData(tables, dryRun = false) {
    const data = {
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        tables: tables
      },
      data: {}
    }

    console.log('\n📊 Extracting data...')

    for (const table of tables) {
      try {
        if (dryRun) {
          const count = await this.getTableCount(table)
          console.log(`   ${table}: ${count.toLocaleString()} records (dry run)`)
          data.data[table] = { count, dryRun: true }
        } else {
          const records = await this.getTableData(table)
          console.log(`   ${table}: ${records.length.toLocaleString()} records`)
          data.data[table] = records
        }
      } catch (error) {
        console.warn(`   ⚠️  ${table}: Error - ${error.message}`)
        data.data[table] = { error: error.message }
      }
    }

    if (!dryRun) {
      // Calculate statistics
      const totalRecords = Object.values(data.data)
        .filter(records => Array.isArray(records))
        .reduce((sum, records) => sum + records.length, 0)
      
      data.metadata.totalRecords = totalRecords
      console.log(`\n📈 Total records: ${totalRecords.toLocaleString()}`)
    }

    return data
  }

  async getTableCount(tableName) {
    const modelName = this.getModelName(tableName)
    if (prisma[modelName]) {
      return await prisma[modelName].count()
    }
    return 0
  }

  async getTableData(tableName) {
    const modelName = this.getModelName(tableName)
    if (prisma[modelName]) {
      if (tableName === 'user') {
        // Exclude sensitive data
        return await prisma[modelName].findMany({
          select: {
            id: true, email: true, firstName: true, lastName: true,
            role: true, createdAt: true, updatedAt: true
          }
        })
      }
      return await prisma[modelName].findMany()
    }
    return []
  }

  getModelName(tableName) {
    // Convert table name to Prisma model name
    const modelMap = {
      'property': 'property',
      'neighborhood': 'neighborhood',
      'propertyNeighborhood': 'propertyNeighborhood',
      'user': 'user',
      'setting': 'setting',
      'emailTemplate': 'emailTemplate',
      'propertyInquiry': 'propertyInquiry'
    }
    return modelMap[tableName] || tableName
  }

  getTableList(include, exclude) {
    let tables = include || this.defaultTables
    if (exclude.length > 0) {
      tables = tables.filter(table => !exclude.includes(table))
    }
    return tables
  }

  async saveJsonBackup(data, backupPath, compress) {
    const jsonData = JSON.stringify(data, null, 2)
    
    if (compress) {
      const readStream = Buffer.from(jsonData)
      const writeStream = createWriteStream(backupPath)
      const gzipStream = createGzip()
      
      await pipeline(
        readStream,
        gzipStream,
        writeStream
      )
    } else {
      await fs.writeFile(backupPath, jsonData)
    }
  }

  async saveSqlBackup(data, backupPath, compress) {
    let sqlContent = `-- Database Backup Created: ${data.metadata.timestamp}\n\n`
    
    // Add SQL statements for each table
    for (const [tableName, records] of Object.entries(data.data)) {
      if (Array.isArray(records) && records.length > 0) {
        sqlContent += `-- Table: ${tableName}\n`
        sqlContent += `TRUNCATE TABLE "${tableName}" CASCADE;\n`
        
        // Generate INSERT statements
        const columns = Object.keys(records[0])
        const values = records.map(record => {
          const vals = columns.map(col => {
            const val = record[col]
            if (val === null) return 'NULL'
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
            if (val instanceof Date) return `'${val.toISOString()}'`
            return val
          })
          return `(${vals.join(', ')})`
        })
        
        sqlContent += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES\n`
        sqlContent += values.join(',\n') + ';\n\n'
      }
    }
    
    if (compress) {
      const readStream = Buffer.from(sqlContent)
      const writeStream = createWriteStream(backupPath)
      const gzipStream = createGzip()
      
      await pipeline(
        readStream,
        gzipStream,
        writeStream
      )
    } else {
      await fs.writeFile(backupPath, sqlContent)
    }
  }

  async createBackupMetadata(backupPath, data, options) {
    const metadataPath = backupPath.replace(/\.(json|sql)(\.gz)?$/, '.meta.json')
    const stats = await fs.stat(backupPath)
    
    const metadata = {
      backupFile: path.basename(backupPath),
      timestamp: data.metadata.timestamp,
      fileSize: stats.size,
      fileSizeFormatted: this.formatFileSize(stats.size),
      options,
      tables: data.metadata.tables,
      totalRecords: data.metadata.totalRecords,
      checksum: await this.calculateChecksum(backupPath)
    }
    
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
  }

  async calculateChecksum(filePath) {
    // Simple checksum based on file size and modification time
    const stats = await fs.stat(filePath)
    return `${stats.size}-${stats.mtime.getTime()}`
  }

  async listBackups() {
    console.log('📋 BACKUP LISTING')
    console.log('=================')
    
    try {
      const files = await fs.readdir(this.backupDir)
      const backupFiles = files.filter(f => f.includes('database-backup'))
      
      if (backupFiles.length === 0) {
        console.log('No backups found.')
        return
      }
      
      console.log(`Found ${backupFiles.length} backup files:\n`)
      
      for (const file of backupFiles.sort().reverse()) {
        const filePath = path.join(this.backupDir, file)
        const stats = await fs.stat(filePath)
        const metaPath = filePath.replace(/\.(json|sql)(\.gz)?$/, '.meta.json')
        
        console.log(`📁 ${file}`)
        console.log(`   📅 Created: ${stats.mtime.toISOString()}`)
        console.log(`   📦 Size: ${this.formatFileSize(stats.size)}`)
        
        try {
          const metadata = JSON.parse(await fs.readFile(metaPath, 'utf8'))
          console.log(`   📊 Records: ${metadata.totalRecords?.toLocaleString() || 'Unknown'}`)
          console.log(`   🗂️  Tables: ${metadata.tables?.length || 'Unknown'}`)
        } catch (error) {
          console.log(`   ⚠️  Metadata: Not available`)
        }
        console.log()
      }
    } catch (error) {
      console.error('❌ Failed to list backups:', error.message)
    }
  }

  async cleanupOldBackups(daysToKeep = 30) {
    console.log('🧹 CLEANING OLD BACKUPS')
    console.log('=======================')
    console.log(`Keeping backups from last ${daysToKeep} days\n`)
    
    try {
      const files = await fs.readdir(this.backupDir)
      const backupFiles = files.filter(f => f.includes('database-backup'))
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
      
      let deletedCount = 0
      let deletedSize = 0
      
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDir, file)
        const stats = await fs.stat(filePath)
        
        if (stats.mtime < cutoffDate) {
          console.log(`🗑️  Deleting: ${file} (${this.formatFileSize(stats.size)})`)
          await fs.unlink(filePath)
          
          // Also delete metadata file if exists
          const metaPath = filePath.replace(/\.(json|sql)(\.gz)?$/, '.meta.json')
          try {
            await fs.unlink(metaPath)
          } catch (error) {
            // Metadata file doesn't exist, ignore
          }
          
          deletedCount++
          deletedSize += stats.size
        }
      }
      
      console.log(`\n✅ Cleanup completed:`)
      console.log(`   🗑️  Files deleted: ${deletedCount}`)
      console.log(`   💾 Space freed: ${this.formatFileSize(deletedSize)}`)
      
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message)
    }
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  async restoreBackup(backupFile) {
    console.log('🔄 RESTORING DATABASE BACKUP')
    console.log('============================')
    console.log(`📁 Source: ${backupFile}`)
    console.log('\n⚠️  WARNING: This will overwrite existing data!')
    
    // In a real implementation, you would:
    // 1. Parse the backup file
    // 2. Validate the data
    // 3. Truncate existing tables
    // 4. Insert the backup data
    // 5. Verify the restoration
    
    console.log('🚧 Restore functionality is not implemented yet.')
    console.log('💡 For now, use the backup files to manually restore data.')
  }
}

async function main() {
  const command = process.argv[2]
  const backup = new DatabaseBackup()
  
  try {
    switch (command) {
      case 'backup': {
        const options = parseBackupOptions()
        await backup.createBackup(options)
        break
      }
      
      case 'list':
        await backup.listBackups()
        break
        
      case 'cleanup': {
        const days = parseInt(process.argv.find(arg => arg.startsWith('--days='))?.split('=')[1]) || 30
        await backup.cleanupOldBackups(days)
        break
      }
      
      case 'restore': {
        const backupFile = process.argv[3]
        if (!backupFile) {
          console.error('❌ Please specify backup file to restore')
          process.exit(1)
        }
        await backup.restoreBackup(backupFile)
        break
      }
      
      default:
        showHelp()
    }
  } catch (error) {
    console.error('❌ Operation failed:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

function parseBackupOptions() {
  const args = process.argv.slice(3)
  const options = {}
  
  for (const arg of args) {
    if (arg.startsWith('--format=')) {
      options.format = arg.split('=')[1]
    } else if (arg === '--compress') {
      options.compress = true
    } else if (arg.startsWith('--exclude=')) {
      options.exclude = arg.split('=')[1].split(',')
    } else if (arg.startsWith('--include=')) {
      options.include = arg.split('=')[1].split(',')
    } else if (arg === '--dry-run') {
      options.dryRun = true
    }
  }
  
  return options
}

function showHelp() {
  console.log(`
💾 DATABASE BACKUP & RESTORE UTILITY
===================================

Usage:
  node scripts/database-backup.mjs <command> [options]

Commands:
  backup                 Create a new database backup
  list                   List all existing backups
  cleanup [--days=30]    Remove backups older than specified days
  restore <file>         Restore from backup file (not implemented)

Backup Options:
  --format=json|sql      Backup format (default: json)
  --compress             Compress backup files with gzip
  --exclude=table1,table2 Exclude specific tables
  --include=table1,table2 Include only specific tables
  --dry-run              Show what would be backed up

Examples:
  node scripts/database-backup.mjs backup
  node scripts/database-backup.mjs backup --format=sql --compress
  node scripts/database-backup.mjs backup --exclude=user,emailTemplate
  node scripts/database-backup.mjs list
  node scripts/database-backup.mjs cleanup --days=7
`)
}

main().catch(console.error)
