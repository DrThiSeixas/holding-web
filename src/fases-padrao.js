// Passos padrão baseados no Fluxograma de Implementação do Modelo de 3 Células
// Thiago Seixas Advocacia Societária

const FASES_PADRAO = [
  {
    numero: 1,
    nome: 'Fase 1 — DESTINO · Planejamento Sucessório',
    passos: [
      'Constituir a Célula DESTINO com capital social reduzido (menor impacto possível de ITCMD), tendo como únicos sócios os donos do patrimônio',
      'Produzir a minuta do Contrato Social da Célula DESTINO',
      'Registrar o Contrato Social na Junta Comercial e obter NIRE',
      'Inscrever a Célula DESTINO no CNPJ (Receita Federal)',
      'Abrir conta bancária em nome da Célula DESTINO',
      'Os sócios da Célula DESTINO realizam PIX para a conta bancária, cada um no exato valor de sua participação social (pagamento do capital social)',
      'Elaborar Alteração Contratual da Célula DESTINO para doação das quotas dos atuais sócios (donos do patrimônio) aos seus herdeiros, com todas as cláusulas de planejamento sucessório',
      'Produzir a minuta do Acordo de Sócios',
      'Registrar a Alteração Contratual na Junta Comercial',
      'Processar e pagar o ITCMD incidente sobre a doação das quotas',
    ],
  },
  {
    numero: 2,
    nome: 'Fase 2 — COFRE · Planejamento Patrimonial',
    passos: [
      'Constituir a Célula COFRE com capital social de R$ 1.000, tendo como sócios os donos do patrimônio',
      'Produzir a minuta do Contrato Social da Célula COFRE',
      'Registrar o Contrato Social na Junta Comercial e obter NIRE',
      'Inscrever a Célula COFRE no CNPJ (Receita Federal)',
      'Investigar na Prefeitura Municipal o modus operandi em relação à cobrança de ITBI (apuração do ITBI)',
      'Definir vertente de integralização: (1ª) sem cobrança sobre diferença entre valor de mercado e IR — usar valor da declaração IR; ou (2ª) com cobrança — usar valor de mercado da Prefeitura com sistema de AVJ',
      'Elaborar Alteração Contratual da Célula COFRE para aumento de capital social e integralização com os bens imóveis da pessoa física (preenchimento do COFRE)',
      'Registrar a Alteração Contratual na Junta Comercial',
      'Averbar a transferência dos imóveis no Cartório de Registro de Imóveis',
    ],
  },
  {
    numero: 3,
    nome: 'Fase 3 — VEÍCULO · Planejamento Tributário',
    passos: [
      'Constituir a Célula VEÍCULO em nome dos detentores do patrimônio (sócios da Célula COFRE), com capital social igual ao da Célula DESTINO + R$ 1.000',
      'Emitir quotas ordinárias no valor de R$ 1,00 cada, na mesma quantidade e distribuição dos sócios da Célula DESTINO no momento inicial',
      'Emitir 1 quota preferencial no valor de R$ 1.000, pertencente aos mesmos donos das quotas da Célula COFRE (Golden Share)',
      'Definir peso de voto da quota preferencial equivalente a X+1 vezes o peso de cada quota ordinária, onde X é o número total de quotas ordinárias',
      'Os sócios da Célula VEÍCULO pagam à sociedade o exato valor do capital social da Célula COFRE para integralizar sua participação',
      'Inserir no contrato social cláusula de que o excedente vai para reserva de capital (art. 13, §2º da Lei 6.404/1976)',
      'Inserir cláusula de call da quota preferencial em caso de falecimento, tendo como compradores os herdeiros',
      'Elaborar Alteração Contratual da Célula COFRE para transferir a titularidade das quotas para a Célula VEÍCULO',
      'Elaborar Alteração Contratual da Célula VEÍCULO para que a Célula DESTINO compre todas as quotas ordinárias pelo valor nominal, mantendo o controle com os donos do patrimônio via quotas preferenciais',
      'Registrar todas as alterações contratuais na Junta Comercial',
      'Inscrever a Célula VEÍCULO no CNPJ (Receita Federal)',
    ],
  },
];

module.exports = { FASES_PADRAO };
