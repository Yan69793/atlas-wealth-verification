import cron from 'node-cron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ingestFile } from '../parsers/registry.js';
import { runEngine } from '../engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

interface ScheduledAudit {
  id: string;
  cronExpression: string;
  filePath: string;
  mes: string;
  baseline: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

class AuditScheduler {
  private scheduledAudits: Map<string, any> = new Map();
  private auditConfigs: Map<string, ScheduledAudit> = new Map();

  constructor() {
    this.loadConfigurations();
  }

  private async loadConfigurations() {
    try {
      const configPath = path.join(ROOT, 'audit-schedules.json');
      const configExists = await fs.access(configPath).then(() => true).catch(() => false);
      
      if (configExists) {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const configs: ScheduledAudit[] = JSON.parse(configContent);
        
        for (const config of configs) {
          if (config.enabled) {
            this.scheduleAudit(config);
          }
          this.auditConfigs.set(config.id, config);
        }
        
        console.log(`Loaded ${configs.length} audit schedules`);
      }
    } catch (error) {
      console.error('Error loading audit schedules:', error);
    }
  }

  public scheduleAudit(config: ScheduledAudit): boolean {
    try {
      // Validate cron expression
      if (!cron.validate(config.cronExpression)) {
        console.error(`Invalid cron expression for audit ${config.id}: ${config.cronExpression}`);
        return false;
      }

      // Check if already scheduled
      if (this.scheduledAudits.has(config.id)) {
        console.warn(`Audit ${config.id} is already scheduled`);
        return false;
      }

      // Create scheduled task
      const task = cron.schedule(config.cronExpression, async () => {
        await this.runAudit(config);
      }, {
        timezone: 'America/Sao_Paulo',
      });

      this.scheduledAudits.set(config.id, task);
      this.auditConfigs.set(config.id, config);
      
      console.log(`Scheduled audit ${config.id} with cron: ${config.cronExpression}`);
      return true;
    } catch (error) {
      console.error(`Error scheduling audit ${config.id}:`, error);
      return false;
    }
  }

  public unscheduleAudit(id: string): boolean {
    const task = this.scheduledAudits.get(id);
    if (!task) {
      console.warn(`Audit ${id} is not scheduled`);
      return false;
    }

    task.stop();
    this.scheduledAudits.delete(id);
    
    const config = this.auditConfigs.get(id);
    if (config) {
      config.enabled = false;
    }
    
    console.log(`Unscheduled audit ${id}`);
    return true;
  }

  private async runAudit(config: ScheduledAudit) {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting scheduled audit: ${config.id}`);

    try {
      // Update last run time
      config.lastRun = new Date();
      this.auditConfigs.set(config.id, config);

      // Check if file exists
      const fileExists = await fs.access(config.filePath).then(() => true).catch(() => false);
      if (!fileExists) {
        console.error(`Audit file not found: ${config.filePath}`);
        return;
      }

      // Run audit
      const carteiras = await ingestFile({ 
        arquivo: config.filePath, 
        mes: config.mes, 
        baseline: config.baseline 
      });
      
      const meta = { 
        mes: config.mes, 
        baseline: config.baseline, 
        arquivo: path.basename(config.filePath), 
        processadoEm: new Date().toISOString(),
        scheduledAudit: true,
        auditId: config.id,
      };
      
      const output = runEngine(carteiras, { meta });

      // Save results
      const auditPath = path.join(ROOT, 'audits', config.mes, `audit_scheduled_${config.id}.json`);
      await fs.mkdir(path.dirname(auditPath), { recursive: true });
      await fs.writeFile(auditPath, JSON.stringify(output, null, 2), 'utf-8');

      // Update dashboard if this is the latest audit
      const dataJsonPath = path.join(ROOT, 'data.json');
      const dataJsPath = path.join(ROOT, 'data.js');
      await fs.writeFile(dataJsonPath, JSON.stringify(output.dashboard, null, 2), 'utf-8');
      await fs.writeFile(dataJsPath, `window.AUDIT_DATA = ${JSON.stringify(output.dashboard)};`, 'utf-8');

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Completed scheduled audit ${config.id} in ${duration}ms`);
      console.log(`Results: ${output.dashboard.carteiras.length} portfolios, ${output.dashboard.summary.totals.liberar} to release, ${output.dashboard.summary.totals.alerta} alerts, ${output.dashboard.summary.totals.corrigir} to correct`);

      // TODO: Send notification/alert based on results
      await this.sendNotification(config, output);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error running scheduled audit ${config.id}:`, error);
    }
  }

  private async sendNotification(config: ScheduledAudit, output: any) {
    // TODO: Implement notification system (email, Slack, etc.)
    const totals = output.dashboard.summary.totals;
    
    if (totals.corrigir > 0) {
      console.log(`ALERT: Scheduled audit ${config.id} found ${totals.corrigir} portfolios requiring correction`);
    }
    
    if (totals.alerta > 0) {
      console.log(`WARNING: Scheduled audit ${config.id} found ${totals.alerta} portfolios with alerts`);
    }
  }

  public getScheduledAudits(): ScheduledAudit[] {
    return Array.from(this.auditConfigs.values());
  }

  public async saveConfigurations() {
    try {
      const configPath = path.join(ROOT, 'audit-schedules.json');
      const configs = Array.from(this.auditConfigs.values());
      await fs.writeFile(configPath, JSON.stringify(configs, null, 2), 'utf-8');
      console.log(`Saved ${configs.length} audit schedules to configuration file`);
    } catch (error) {
      console.error('Error saving audit schedules:', error);
    }
  }

  public stopAll() {
    for (const [id, task] of this.scheduledAudits.entries()) {
      task.stop();
      console.log(`Stopped scheduled audit: ${id}`);
    }
    this.scheduledAudits.clear();
  }
}

// Singleton instance
const auditScheduler = new AuditScheduler();

export default auditScheduler;
