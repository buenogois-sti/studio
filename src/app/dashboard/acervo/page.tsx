'use client';
import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { DocumentTemplate } from '@/lib/types';
import { H1 } from '@/components/ui/typography';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Library, ExternalLink } from 'lucide-react';
import Link from 'next/link';

// Group templates by category
function groupTemplatesByCategory(templates: DocumentTemplate[]): Record<string, DocumentTemplate[]> {
    return templates.reduce((acc, template) => {
        const category = template.category || 'Outros';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(template);
        return acc;
    }, {} as Record<string, DocumentTemplate[]>);
}

export default function AcervoPage() {
    const { firestore, isUserLoading } = useFirebase();

    const templatesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'document_templates'), orderBy('category'), orderBy('name')) : null),
        [firestore]
    );
    const { data: templatesData, isLoading: isLoadingTemplates } = useCollection<DocumentTemplate>(templatesQuery);

    const isLoading = isUserLoading || isLoadingTemplates;
    const groupedTemplates = templatesData ? groupTemplatesByCategory(templatesData) : {};
    const categories = Object.keys(groupedTemplates).sort();

    return (
        <div className="flex flex-col gap-6">
            <H1>Acervo de Modelos</H1>
            <CardDescription>
                Biblioteca de documentos padrão do escritório. Utilize estes modelos para garantir consistência e agilidade.
            </CardDescription>

            {isLoading ? (
                <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader><Skeleton className="h-8 w-1/4" /></CardHeader>
                            <CardContent><Skeleton className="h-24 w-full" /></CardContent>
                        </Card>
                    ))}
                </div>
            ) : categories.length > 0 ? (
                <Accordion type="multiple" defaultValue={categories} className="w-full space-y-4">
                    {categories.map(category => (
                        <AccordionItem key={category} value={category} className="border-b-0">
                            <Card className="overflow-hidden">
                                <AccordionTrigger className="p-6 text-lg font-headline hover:no-underline">
                                    {category}
                                </AccordionTrigger>
                                <AccordionContent className="p-0">
                                    <div className="border-t">
                                        {groupedTemplates[category].map(template => (
                                            <div key={template.id} className="grid grid-cols-[1fr_auto] items-center gap-4 px-6 py-4 border-b last:border-b-0">
                                                <div>
                                                    <p className="font-semibold">{template.name}</p>
                                                    <p className="text-sm text-muted-foreground">{template.description}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button asChild variant="secondary">
                                                        <Link href={`https://docs.google.com/document/d/${template.templateFileId}/edit`} target="_blank">
                                                            <ExternalLink className="mr-2 h-4 w-4" />
                                                            Abrir Modelo
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-96">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <Library className="h-12 w-12 text-muted-foreground" />
                        <h3 className="text-2xl font-bold tracking-tight">Nenhum modelo encontrado</h3>
                        <p className="text-sm text-muted-foreground">
                            Peça a um administrador para adicionar modelos de documentos na tela de Configurações.
                        </p>
                        <Button className="mt-4" asChild>
                            <Link href="/dashboard/configuracoes">Ir para Configurações</Link>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

    