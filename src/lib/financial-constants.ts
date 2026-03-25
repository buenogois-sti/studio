export const EXPENSE_CATEGORIES = {
  CONTAS_CONSUMO: {
    label: 'Contas de Consumo',
    subcategories: [
      'Energia Elétrica',
      'Água e Esgoto',
      'Internet / Link Dedicado',
      'Telefonia Móvel / Fixa',
      'Gás Canalizado',
      'Limpeza / Conservação'
    ]
  },
  INFRAESTRUTURA_TI: {
    label: 'Infraestrutura e TI',
    subcategories: [
      'Licenças de Software',
      'Hospedagem / Cloud (AWS/Azure)',
      'Suporte Técnico',
      'Manutenção de Hardware'
    ]
  },
  MARKETING_PUBLICIDADE: {
    label: 'Marketing e Publicidade',
    subcategories: [
      'Google Ads / Meta Ads',
      'Gestão de Redes Sociais',
      'Identidade Visual / Gráfica',
      'Eventos / Networking'
    ]
  },
  MATERIAL_ESCRITORIO: {
    label: 'Material de Escritório',
    subcategories: [
      'Papelaria / Impressão',
      'Copa e Cozinha',
      'Higiene e Limpeza'
    ]
  },
  OUTRAS_DESPESAS: {
    label: 'Despesas Diversas',
    subcategories: [
      'Custas de Cartório',
      'Correios / Motoboy',
      'Assinaturas / Revistas',
      'Seguros'
    ]
  }
};

export const REVENUE_CATEGORIES = {
  HONORARIOS_CONTRATUAIS: {
    label: 'Honorários Contratuais',
    subcategories: [
      'Assessoria Mensal (Retainer)',
      'Consultoria Avulsa',
      'Pareceres Jurídicos'
    ]
  },
  HONORARIOS_SUCUMBENCIA: {
    label: 'Honorários de Sucumbência',
    subcategories: [
      'Justiça Comum',
      'Justiça do Trabalho',
      'Justiça Federal'
    ]
  },
  HONORARIOS_EXITO: {
    label: 'Honorários sobre o Êxito (Quota Litis)',
    subcategories: [
      'Acordos Judiciais',
      'Acordos Extrajudiciais',
      'Levantamento de Alvarás'
    ]
  },
  ALVARA: {
    label: 'Alvarás e Levantamentos',
    subcategories: [
      'Alvará de Pagamento',
      'Alvará de FGTS / PIS',
      'RPV / Precatórios'
    ]
  },
  TRANSFERENCIAS_JUDICIAIS: {
    label: 'Transferências Judiciais',
    subcategories: [
      'Depósitos Recursais',
      'Bloqueios Online (SISBAJUD)',
      'Pagamentos por Guia'
    ]
  }
};
