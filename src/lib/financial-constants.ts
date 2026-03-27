export const EXPENSE_CATEGORIES = {
  CONTAS_CONSUMO: {
    label: 'Contas de Consumo',
    subcategories: [
      'Energia Elétrica',
      'Água e Esgoto',
      'Internet / Link Dedicado',
      'Telefonia Móvel / Fixa',
      'Gás Canalizado',
      'Limpeza / Conservação',
      'Assinaturas Digital (Netflix/Spotify/TV)',
      'Monitoramento / Alarme'
    ]
  },
  INFRAESTRUTURA_IMOBILIARIA: {
    label: 'Infraestrutura e Imóveis',
    subcategories: [
      'Aluguel de Escritório',
      'Condomínio / Taxas Prediais',
      'IPTU Escritório',
      'Seguro Incêndio / Predial',
      'Manutenção de Ar-condicionado',
      'Mobiliário / Decoração',
      'Reformas e Melhorias'
    ]
  },
  RECURSOS_HUMANOS: {
    label: 'Recursos Humanos / Pessoal',
    subcategories: [
      'Salários / CLTs',
      'Pró-labore Sócios',
      'Estagiários / Bolsas',
      'Encargos (FGTS/INSS)',
      'Vale Alimentação / Refeição',
      'Vale Transporte / Auxílio Combustível',
      'Plano de Saúde / Odonto',
      'Bônus / Premiações',
      'Treinamentos / Cursos'
    ]
  },
  IMPOSTOS_TAXAS: {
    label: 'Impostos e Contribuições',
    subcategories: [
      'Simples Nacional (DAS)',
      'ISS / Taxas Municipais',
      'IRPJ / CSLL / PIS / COFINS',
      'Anuidade OAB',
      'Certificados Digitais (A1/A3)',
      'Taxas Processuais / Judiciárias',
      'Custas de Cartório'
    ]
  },
  SERVICOS_TERCEIROS: {
    label: 'Serviços de Terceiros',
    subcategories: [
      'Assessoria Contábil',
      'Segurança e Vigilância',
      'Limpeza e Conservação',
      'Correspondentes Jurídicos',
      'Consultoria de Gestão',
      'Freelancers / BPO'
    ]
  },
  INFRAESTRUTURA_TI: {
    label: 'Tecnologia e Softwares',
    subcategories: [
      'Licenças de Software (Office/Adobe)',
      'Software de Gestão Jurídica',
      'Hospedagem / Cloud (AWS/Azure/Google)',
      'Backup / Segurança de Dados',
      'Suporte Técnico / Suporte TI',
      'Manutenção de Hardware / Periféricos'
    ]
  },
  MARKETING_PUBLICIDADE: {
    label: 'Marketing e Branding',
    subcategories: [
      'Google Ads / Meta Ads',
      'Tráfego Pago',
      'Gestão de Redes Sociais',
      'Identidade Visual / Logo',
      'Brindes / Papelaria Institucional',
      'Eventos / Patrocínios / Palestras'
    ]
  },
  MATERIAL_ESCRITORIO: {
    label: 'Suprimentos e Copa',
    subcategories: [
      'Papel A4 / Toners / Impressão',
      'Insumos de Café / Copa',
      'Higiene e Limpeza (Insumos)',
      'Descartáveis'
    ]
  },
  LOGISTICA_VIAGENS: {
    label: 'Logística e Viagens',
    subcategories: [
      'Combustível / Estacionamento',
      'Passagens Aéreas / Rodoviárias',
      'Hospedagem / Hotéis',
      'Refeições em Viagem',
      'Uber / Táxi / Aplicativos',
      'Manutenção de Frota'
    ]
  },
  DESPESAS_BANCARIAS: {
    label: 'Financeiro e Bancário',
    subcategories: [
      'Tarifas de Manutenção de Conta',
      'Juros e Encargos (Empréstimos)',
      'Anuidade de Cartão de Crédito',
      'Taxas de Boleto / PIX',
      'IOF / Impostos sobre Operações'
    ]
  },
  OUTRAS_DESPESAS: {
    label: 'Eventuais / Diversas',
    subcategories: [
      'Doações / Filantropia',
      'Multas / Penalidades',
      'Presentes / Datas Comemorativas',
      'Despesas Não Classificadas'
    ]
  }
};

export const REVENUE_CATEGORIES = {
  HONORARIOS_CONTRATUAIS: {
    label: 'Honorários de Assessoria',
    subcategories: [
      'Retainer Mensal (Partido)',
      'Consultoria Consultiva / Parecer',
      'Honorários Iniciais (Pró-Labore)',
      'Consultas Jurídicas',
      'Adequação LGPD / Compliance'
    ]
  },
  HONORARIOS_SUCUMBENCIA: {
    label: 'Honorários de Sucumbência',
    subcategories: [
      'Justiça Estadual / Comum',
      'Justiça do Trabalho',
      'Justiça Federal',
      'Tribunais Superiores'
    ]
  },
  HONORARIOS_EXITO: {
    label: 'Honorários sobre Êxito',
    subcategories: [
      'Percentual sobre Valor Ganho',
      'Acordos Judiciais (Quota Litis)',
      'Acordos Extrajudiciais',
      'Bonificações por Resultado'
    ]
  },
  ALVARA: {
    label: 'Alvarás e Precatórios',
    subcategories: [
      'Alvará Judicial de Pagamento',
      'RPV (Requisição Pequeno Valor)',
      'Precatórios Estaduais/Federais',
      'Levantamento de Depósito Judicial'
    ]
  },
  TRANSFERENCIAS_JUDICIAIS: {
    label: 'Liquidações Judiciais',
    subcategories: [
      'Pagamento Condenatório Direto',
      'Bloqueio SISBAJUD Liberado',
      'Guia de Levantamento Especial'
    ]
  },
  RENDIMENTOS_INVESTIMENTOS: {
    label: 'Rendimentos Financeiros',
    subcategories: [
      'Rendimentos CDB / Renda Fixa',
      'Dividendos / JCP',
      'Juros sobre Capital de Giro',
      'Variação Cambial Positiva'
    ]
  },
  OUTRAS_RECEITAS: {
    label: 'Receitas Extraordinárias',
    subcategories: [
      'Ressarcimento de Despesas Processuais',
      'Venda de Ativos / Móveis',
      'Reembolsos de Viagens',
      'Indenizações Recebidas'
    ]
  }
};
