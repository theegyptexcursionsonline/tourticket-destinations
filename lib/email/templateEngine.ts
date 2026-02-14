// lib/email/templateEngine.ts
import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';

// Register Handlebars helpers
Handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

Handlebars.registerHelper('or', function(...args) {
  // Remove options object (last argument)
  const values = args.slice(0, -1);
  return values.some(value => !!value);
});

export class TemplateEngine {
  private static templateCache = new Map<string, HandlebarsTemplateDelegate>();
  private static templatesPath = path.join(process.cwd(), 'lib/email/templates');

  static async loadTemplate(templateName: string): Promise<string> {
    try {
      const templatePath = path.join(this.templatesPath, `${templateName}.html`);
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      return templateSource;
    } catch (error) {
      console.error(`Error loading template ${templateName}:`, error);
      throw new Error(`Template ${templateName} not found`);
    }
  }

  static replaceVariables(template: string, data: Record<string, unknown> | any): string {
    // Use Handlebars to compile and render the template
    const compiledTemplate = Handlebars.compile(template);
    return compiledTemplate(data);
  }

  static generateSubject(template: string, data: Record<string, unknown> | any): string {
    // Subjects are plain text — decode HTML entities that Handlebars auto-escapes
    const rendered = this.replaceVariables(template, data);
    return rendered
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'");
  }
}
