import type { Client, User, Transaction } from '@/lib/types';

export const user: User = {
  name: 'Sofia Mendes',
  email: 'sofia.mendes@lexflow.com',
  avatarUrl: 'https://picsum.photos/seed/1/100/100',
  role: 'admin',
};

export const clients: Client[] = [
  {
    id: '1',
    name: 'Innovatech Soluções',
    avatar: 'https://picsum.photos/seed/c1/40/40',
    document: '12.345.678/0001-99',
    email: 'contato@innovatech.com',
    createdAt: '2023-01-15',
  },
  {
    id: '2',
    name: 'Construtora Alfa',
    avatar: 'https://picsum.photos/seed/c2/40/40',
    document: '98.765.432/0001-11',
    email: 'financeiro@alfa.com.br',
    createdAt: '2023-02-20',
  },
  {
    id: '3',
    name: 'AgroNegócios Brasil',
    avatar: 'https://picsum.photos/seed/c3/40/40',
    document: '45.123.789/0001-33',
    email: 'juridico@agronegocios.com',
    createdAt: '2023-03-10',
  },
  {
    id: '4',
    name: 'Varejo Total Ltda',
    avatar: 'https://picsum.photos/seed/c4/40/40',
    document: '33.444.555/0001-77',
    email: 'compras@varejototal.net',
    createdAt: '2023-04-05',
  },
  {
    id: '5',
    name: 'EducaMais Cursos',
    avatar: 'https://picsum.photos/seed/c5/40/40',
    document: '11.222.333/0001-88',
    email: 'secretaria@educamais.com',
    createdAt: '2023-05-21',
  },
];

export const transactions: Transaction[] = [
    { id: '1', description: 'Honorários Iniciais - Innovatech', amount: 15000, type: 'receita', date: '2023-05-01', clientName: 'Innovatech Soluções' },
    { id: '2', description: 'Pagamento de custas processuais', amount: -850.50, type: 'despesa', date: '2023-05-03', clientName: 'Construtora Alfa' },
    { id: '3', description: 'Acordo - Varejo Total', amount: 7500, type: 'receita', date: '2023-05-05', clientName: 'Varejo Total Ltda' },
    { id: '4', description: 'Despesas com perito', amount: -2500, type: 'despesa', date: '2023-05-10', clientName: 'Innovatech Soluções' },
    { id: '5', description: 'Honorários de Êxito - AgroNegócios', amount: 35000, type: 'receita', date: '2023-05-15', clientName: 'AgroNegócios Brasil' },
]

export const chartData = [
  { month: 'Janeiro', newCases: 4 },
  { month: 'Fevereiro', newCases: 3 },
  { month: 'Março', newCases: 5 },
  { month: 'Abril', newCases: 7 },
  { month: 'Maio', newCases: 6 },
  { month: 'Junho', newCases: 8 },
];

export const recentActivities = [
    { id: 1, description: 'Audiência agendada para o Processo 2023/001', time: 'Há 2 horas' },
    { id: 2, description: 'Novo documento adicionado ao cliente Innovatech', time: 'Há 5 horas' },
    { id: 3, description: 'Pagamento de honorários recebido', time: 'Ontem' },
    { id: 4, description: 'Prazo final para o Processo 2022/157 se aproxima', time: 'Há 2 dias' },
];
