'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, UserPlus, CheckCircle2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { bulkCreateClients } from '@/lib/client-actions';

interface ParsedContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  selected: boolean;
}

export function VCFImportDialog({ open, onOpenChange, onImportSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onImportSuccess: () => void }) {
  const [isParsing, setIsParsing] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [contacts, setContacts] = React.useState<ParsedContact[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const text = await file.text();
      const parsed = parseVCF(text);
      setContacts(parsed);
      if (parsed.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Nenhum contato encontrado',
          description: 'Não conseguimos ler contatos válidos deste arquivo VCF.',
        });
      }
    } catch (error) {
      console.error('Error parsing VCF:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na leitura',
        description: 'Não foi possível processar o arquivo VCF.',
      });
    } finally {
      setIsParsing(false);
    }
  };

  const parseVCF = (content: string): ParsedContact[] => {
    const blocks = content.split('BEGIN:VCARD');
    const results: ParsedContact[] = [];

    blocks.forEach((block, index) => {
      if (!block.trim()) return;

      // Extract Name
      const fnMatch = block.match(/^FN:(.*)$/m);
      const nameMatch = block.match(/^N:(.*)$/m);
      let fullName = fnMatch ? fnMatch[1].trim() : (nameMatch ? nameMatch[1].replace(/;/g, ' ').trim() : '');
      
      // Extract Email
      const emailMatch = block.match(/^EMAIL(?:;.*)?:(.*)$/m);
      const email = emailMatch ? emailMatch[1].trim() : '';

      // Extract Phone (Mobile priority)
      const telMatches = block.matchAll(/^TEL(?:;.*)?:(.*)$/gm);
      let phone = '';
      for (const match of telMatches) {
        const val = match[1].trim();
        if (val) {
          phone = val;
          break; // Take first one for now
        }
      }

      if (fullName) {
        const parts = fullName.split(' ');
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ') || 'Importado';

        results.push({
          id: `contact-${index}`,
          firstName,
          lastName,
          email,
          mobile: phone,
          selected: true,
        });
      }
    });

    return results;
  };

  const toggleSelectAll = () => {
    const allSelected = contacts.every(c => c.selected);
    setContacts(contacts.map(c => ({ ...c, selected: !allSelected })));
  };

  const toggleSelect = (id: string) => {
    setContacts(contacts.map(c => c.id === id ? { ...c, selected: !c.selected } : c));
  };

  const handleImport = async () => {
    const selectedContacts = contacts.filter(c => c.selected);
    if (selectedContacts.length === 0) return;

    setIsImporting(true);
    try {
      const result = await bulkCreateClients(selectedContacts.map(c => ({
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        mobile: c.mobile,
      })));

      if (result.success) {
        toast({
          title: 'Importação Concluída',
          description: `${result.count} novos clientes foram adicionados.`,
        });
        onImportSuccess();
        onOpenChange(false);
        setContacts([]);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na Importação',
        description: error.message || 'Ocorreu um erro ao salvar os contatos.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Base de Clientes (VCF)</DialogTitle>
          <DialogDescription>
            Selecione um arquivo .vcf exportado do seu celular ou e-mail para carregar os contatos.
          </DialogDescription>
        </DialogHeader>

        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/5">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isParsing}>
              {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isParsing ? 'Processando arquivo...' : 'Selecionar Arquivo .VCF'}
            </Button>
            <input
              type="file"
              accept=".vcf"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Checkbox id="select-all" checked={contacts.every(c => c.selected)} onCheckedChange={toggleSelectAll} />
                <label htmlFor="select-all" className="text-sm font-medium leading-none cursor-pointer">
                  Selecionar Todos ({contacts.length})
                </label>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setContacts([])}>Limpar Lista</Button>
            </div>

            <ScrollArea className="h-[350px] rounded-md border p-4">
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center space-x-4 p-2 hover:bg-muted/50 rounded-lg transition-colors border border-transparent hover:border-border">
                    <Checkbox
                      id={contact.id}
                      checked={contact.selected}
                      onCheckedChange={() => toggleSelect(contact.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">
                        {contact.firstName} {contact.lastName}
                      </p>
                      <div className="flex gap-4 mt-1">
                        {contact.email && <p className="text-xs text-muted-foreground truncate">{contact.email}</p>}
                        {contact.mobile && <p className="text-xs text-muted-foreground">{contact.mobile}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>Cancelar</Button>
          <Button onClick={handleImport} disabled={isImporting || contacts.filter(c => c.selected).length === 0}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            {isImporting ? 'Importando...' : `Importar Selecionados (${contacts.filter(c => c.selected).length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
