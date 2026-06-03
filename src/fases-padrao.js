// Passos baseados no Fluxograma de Implementação do Modelo de 3 Células
// Cada passo tem: descricao, tipo_evidencia, campos_evidencia, instrucao_evidencia

const TIPO_EVIDENCIA = {
  NENHUMA:   'nenhuma',    // Apenas marcar como feito
  TEXTO:     'texto',      // Campo de texto livre
  NUMERO:    'numero',     // Número (NIRE, CNPJ, etc)
  DATA:      'data',       // Data
  DATA_NUM:  'data_num',   // Data + Número
  BANCO:     'banco',      // Banco + Agência + Conta
  UPLOAD:    'upload',     // Upload de arquivo
  FORM:      'form',       // Formulário composto
};

const FASES_PADRAO = [
  {
    numero: 1,
    nome: 'Fase 1 — DESTINO · Planejamento Sucessório',
    passos: [
      {
        ordem: 1,
        descricao: 'Constituir a Célula DESTINO com capital social reduzido (menor impacto de ITCMD), tendo como únicos sócios os donos do patrimônio',
        tipo_evidencia: TIPO_EVIDENCIA.NENHUMA,
        instrucao: 'Marque quando o contrato social estiver assinado pelas partes.',
      },
      {
        ordem: 2,
        descricao: 'Elaborar e assinar a minuta do Contrato Social da Célula DESTINO',
        tipo_evidencia: TIPO_EVIDENCIA.DATA,
        instrucao: 'Informe a data de assinatura do contrato social.',
        campos: [{ nome: 'data_assinatura', label: 'Data de Assinatura', tipo: 'date' }],
      },
      {
        ordem: 3,
        descricao: 'Registrar o Contrato Social da Célula DESTINO na Junta Comercial (JUCESP) e obter NIRE',
        tipo_evidencia: TIPO_EVIDENCIA.DATA_NUM,
        instrucao: 'Informe a data do registro e o número do NIRE obtido na JUCESP.',
        campos: [
          { nome: 'data_registro', label: 'Data do Registro na Junta', tipo: 'date' },
          { nome: 'nire', label: 'Número do NIRE', tipo: 'text', placeholder: 'Ex: 35.2.0123456-7', mask: '' },
        ],
      },
      {
        ordem: 4,
        descricao: 'Inscrever a Célula DESTINO no CNPJ (Receita Federal)',
        tipo_evidencia: TIPO_EVIDENCIA.FORM,
        instrucao: 'Informe o CNPJ obtido e a data de abertura na Receita Federal.',
        campos: [
          { nome: 'cnpj', label: 'CNPJ', tipo: 'text', placeholder: '00.000.000/0000-00', mask: 'cnpj' },
          { nome: 'data_abertura_cnpj', label: 'Data de Abertura', tipo: 'date' },
        ],
      },
      {
        ordem: 5,
        descricao: 'Abrir conta bancária em nome da Célula DESTINO',
        tipo_evidencia: TIPO_EVIDENCIA.BANCO,
        instrucao: 'Informe os dados bancários da conta aberta em nome da Célula DESTINO.',
        campos: [
          { nome: 'banco', label: 'Banco', tipo: 'text', placeholder: 'Ex: Itaú, Bradesco, C6 Bank...' },
          { nome: 'agencia', label: 'Agência', tipo: 'text', placeholder: 'Ex: 0001' },
          { nome: 'conta', label: 'Conta', tipo: 'text', placeholder: 'Ex: 12345-6' },
          { nome: 'data_abertura_conta', label: 'Data de Abertura', tipo: 'date' },
        ],
      },
      {
        ordem: 6,
        descricao: 'Realizar PIX para a conta da Célula DESTINO — cada sócio no exato valor de sua participação social (pagamento do capital social)',
        tipo_evidencia: TIPO_EVIDENCIA.FORM,
        instrucao: 'Informe a data e o valor total dos PIX realizados. Anexe os comprovantes de transferência.',
        campos: [
          { nome: 'data_pix', label: 'Data do(s) PIX', tipo: 'date' },
          { nome: 'valor_total_pix', label: 'Valor Total Integralizado (R$)', tipo: 'number', placeholder: '0,00' },
          { nome: 'obs_pix', label: 'Observações (ex: 2 sócios, R$ 500 cada)', tipo: 'text' },
        ],
      },
      {
        ordem: 7,
        descricao: 'Elaborar Alteração Contratual da Célula DESTINO para doação das quotas aos herdeiros, com todas as cláusulas de planejamento sucessório (inalienabilidade, incomunicabilidade, impenhorabilidade, usufruto, reversão)',
        tipo_evidencia: TIPO_EVIDENCIA.DATA,
        instrucao: 'Informe a data de assinatura da Alteração Contratual de doação.',
        campos: [{ nome: 'data_alt_doacao', label: 'Data de Assinatura da Alteração Contratual', tipo: 'date' }],
      },
      {
        ordem: 8,
        descricao: 'Elaborar e assinar o Acordo de Sócios da Célula DESTINO',
        tipo_evidencia: TIPO_EVIDENCIA.DATA,
        instrucao: 'Informe a data de assinatura do Acordo de Sócios.',
        campos: [{ nome: 'data_acordo', label: 'Data de Assinatura do Acordo', tipo: 'date' }],
      },
      {
        ordem: 9,
        descricao: 'Registrar a Alteração Contratual (doação de quotas) na Junta Comercial',
        tipo_evidencia: TIPO_EVIDENCIA.DATA_NUM,
        instrucao: 'Informe a data do registro da alteração contratual na Junta Comercial.',
        campos: [
          { nome: 'data_registro_alt', label: 'Data do Registro na Junta', tipo: 'date' },
          { nome: 'protocolo_alt', label: 'Número do Protocolo / Registro', tipo: 'text', placeholder: 'Ex: 35.000.123456/2026' },
        ],
      },
      {
        ordem: 10,
        descricao: 'Processar e pagar o ITCMD incidente sobre a doação das quotas',
        tipo_evidencia: TIPO_EVIDENCIA.FORM,
        instrucao: 'Informe a data e o valor do ITCMD pago. Guarde o comprovante de recolhimento.',
        campos: [
          { nome: 'data_itcmd', label: 'Data do Pagamento do ITCMD', tipo: 'date' },
          { nome: 'valor_itcmd', label: 'Valor Pago de ITCMD (R$)', tipo: 'number', placeholder: '0,00' },
          { nome: 'guia_itcmd', label: 'Número da Guia ITCMD', tipo: 'text', placeholder: 'Ex: 2026.001.123456' },
        ],
      },
    ],
  },
  {
    numero: 2,
    nome: 'Fase 2 — COFRE · Planejamento Patrimonial',
    passos: [
      {
        ordem: 1,
        descricao: 'Constituir a Célula COFRE com capital social de R$ 1.000, tendo como sócios os donos do patrimônio',
        tipo_evidencia: TIPO_EVIDENCIA.NENHUMA,
        instrucao: 'Marque quando o contrato social estiver assinado.',
      },
      {
        ordem: 2,
        descricao: 'Registrar o Contrato Social da Célula COFRE na Junta Comercial e obter NIRE',
        tipo_evidencia: TIPO_EVIDENCIA.DATA_NUM,
        instrucao: 'Informe a data do registro e o número do NIRE da Célula COFRE.',
        campos: [
          { nome: 'data_registro_cofre', label: 'Data do Registro na Junta', tipo: 'date' },
          { nome: 'nire_cofre', label: 'Número do NIRE', tipo: 'text', placeholder: 'Ex: 35.2.0123456-8' },
        ],
      },
      {
        ordem: 3,
        descricao: 'Inscrever a Célula COFRE no CNPJ (Receita Federal)',
        tipo_evidencia: TIPO_EVIDENCIA.FORM,
        instrucao: 'Informe o CNPJ e data de abertura da Célula COFRE.',
        campos: [
          { nome: 'cnpj_cofre', label: 'CNPJ', tipo: 'text', placeholder: '00.000.000/0000-00', mask: 'cnpj' },
          { nome: 'data_cnpj_cofre', label: 'Data de Abertura', tipo: 'date' },
        ],
      },
      {
        ordem: 4,
        descricao: 'Investigar na Prefeitura Municipal o modus operandi em relação à cobrança de ITBI (apuração do ITBI)',
        tipo_evidencia: TIPO_EVIDENCIA.FORM,
        instrucao: 'Registre o resultado da investigação junto à Prefeitura.',
        campos: [
          { nome: 'prefeitura_municipio', label: 'Município', tipo: 'text' },
          { nome: 'itbi_vertente', label: 'Vertente Aplicável', tipo: 'select', opcoes: [
            '1ª Vertente — Prefeitura não cobra ITBI sobre diferença (usar valor do IR)',
            '2ª Vertente — Prefeitura cobra ITBI sobre diferença (usar valor de mercado/AVJ)',
          ]},
          { nome: 'itbi_obs', label: 'Observações da Prefeitura', tipo: 'text' },
        ],
      },
      {
        ordem: 5,
        descricao: 'Elaborar Alteração Contratual da Célula COFRE para aumento de capital social e integralização com os bens imóveis (preenchimento do COFRE)',
        tipo_evidencia: TIPO_EVIDENCIA.FORM,
        instrucao: 'Informe a data de assinatura e o valor total integralizado.',
        campos: [
          { nome: 'data_alt_cofre', label: 'Data de Assinatura da Alteração', tipo: 'date' },
          { nome: 'valor_integralizacao', label: 'Valor Total Integralizado (R$)', tipo: 'number', placeholder: '0,00' },
          { nome: 'qtd_bens', label: 'Quantidade de Bens Integralizados', tipo: 'number', placeholder: '1' },
        ],
      },
      {
        ordem: 6,
        descricao: 'Registrar a Alteração Contratual de integralização na Junta Comercial',
        tipo_evidencia: TIPO_EVIDENCIA.DATA_NUM,
        instrucao: 'Informe a data e protocolo do registro.',
        campos: [
          { nome: 'data_reg_alt_cofre', label: 'Data do Registro na Junta', tipo: 'date' },
          { nome: 'protocolo_alt_cofre', label: 'Número do Protocolo / Registro', tipo: 'text' },
        ],
      },
      {
        ordem: 7,
        descricao: 'Averbar a transferência dos imóveis no Cartório de Registro de Imóveis',
        tipo_evidencia: TIPO_EVIDENCIA.FORM,
        instrucao: 'Informe os dados da averbação de cada imóvel transferido.',
        campos: [
          { nome: 'data_averbacao', label: 'Data da Averbação', tipo: 'date' },
          { nome: 'cartorio', label: 'Cartório de Registro de Imóveis', tipo: 'text', placeholder: 'Ex: 1º CRI de São Paulo' },
          { nome: 'matriculas', label: 'Matrículas Averbadas', tipo: 'text', placeholder: 'Ex: 12345, 12346, 12347' },
        ],
      },
    ],
  },
  {
    numero: 3,
    nome: 'Fase 3 — VEÍCULO · Planejamento Tributário',
    passos: [
      {
        ordem: 1,
        descricao: 'Constituir a Célula VEÍCULO em nome dos detentores do patrimônio (sócios da Célula COFRE), com capital social igual ao da Célula DESTINO + R$ 1.000',
        tipo_evidencia: TIPO_EVIDENCIA.DATA,
        instrucao: 'Informe a data de assinatura do Contrato Social da Célula VEÍCULO.',
        campos: [{ nome: 'data_cs_veiculo', label: 'Data de Assinatura', tipo: 'date' }],
      },
      {
        ordem: 2,
        descricao: 'Emitir quotas ordinárias (R$ 1,00 cada) na mesma quantidade e distribuição dos sócios da Célula DESTINO no momento inicial + 1 quota preferencial de R$ 1.000 (Golden Share) pertencente aos donos do patrimônio',
        tipo_evidencia: TIPO_EVIDENCIA.FORM,
        instrucao: 'Registre a estrutura de quotas definida no contrato social.',
        campos: [
          { nome: 'qtd_quotas_ord', label: 'Total de Quotas Ordinárias', tipo: 'number', placeholder: 'Ex: 100' },
          { nome: 'valor_capital_total', label: 'Capital Social Total (R$)', tipo: 'number', placeholder: '0,00' },
          { nome: 'peso_voto_pref', label: 'Peso de Voto da Quota Preferencial', tipo: 'text', placeholder: 'Ex: X+1 = 101 votos' },
        ],
      },
      {
        ordem: 3,
        descricao: 'Integralizar o capital social da Célula VEÍCULO — sócios pagam o exato valor do capital social total da Célula COFRE',
        tipo_evidencia: TIPO_EVIDENCIA.FORM,
        instrucao: 'Informe a data e valor dos PIX realizados para integralização do capital.',
        campos: [
          { nome: 'data_integ_veiculo', label: 'Data da Integralização', tipo: 'date' },
          { nome: 'valor_integ_veiculo', label: 'Valor Integralizado (R$)', tipo: 'number', placeholder: '0,00' },
        ],
      },
      {
        ordem: 4,
        descricao: 'Registrar o Contrato Social da Célula VEÍCULO na Junta Comercial e obter NIRE',
        tipo_evidencia: TIPO_EVIDENCIA.DATA_NUM,
        instrucao: 'Informe a data do registro e número do NIRE da Célula VEÍCULO.',
        campos: [
          { nome: 'data_reg_veiculo', label: 'Data do Registro na Junta', tipo: 'date' },
          { nome: 'nire_veiculo', label: 'Número do NIRE', tipo: 'text', placeholder: 'Ex: 35.2.0123456-9' },
        ],
      },
      {
        ordem: 5,
        descricao: 'Inscrever a Célula VEÍCULO no CNPJ (Receita Federal)',
        tipo_evidencia: TIPO_EVIDENCIA.FORM,
        instrucao: 'Informe o CNPJ e data de abertura da Célula VEÍCULO.',
        campos: [
          { nome: 'cnpj_veiculo', label: 'CNPJ', tipo: 'text', placeholder: '00.000.000/0000-00', mask: 'cnpj' },
          { nome: 'data_cnpj_veiculo', label: 'Data de Abertura', tipo: 'date' },
        ],
      },
      {
        ordem: 6,
        descricao: 'Elaborar Alteração Contratual da Célula COFRE para transferir a titularidade das quotas para a Célula VEÍCULO',
        tipo_evidencia: TIPO_EVIDENCIA.DATA_NUM,
        instrucao: 'Informe data de assinatura e protocolo do registro na Junta.',
        campos: [
          { nome: 'data_alt_cofre_veiculo', label: 'Data de Assinatura', tipo: 'date' },
          { nome: 'protocolo_alt_cofre_v', label: 'Protocolo / Registro na Junta', tipo: 'text' },
        ],
      },
      {
        ordem: 7,
        descricao: 'Elaborar Alteração Contratual da Célula VEÍCULO para que a Célula DESTINO compre todas as quotas ordinárias pelo valor nominal, mantendo o controle via quotas preferenciais (Golden Share)',
        tipo_evidencia: TIPO_EVIDENCIA.DATA_NUM,
        instrucao: 'Informe data de assinatura e protocolo do registro na Junta.',
        campos: [
          { nome: 'data_alt_veiculo_destino', label: 'Data de Assinatura', tipo: 'date' },
          { nome: 'protocolo_alt_veiculo', label: 'Protocolo / Registro na Junta', tipo: 'text' },
          { nome: 'valor_compra_ordinarias', label: 'Valor da Compra das Quotas Ordinárias (R$)', tipo: 'number' },
        ],
      },
    ],
  },
];

module.exports = { FASES_PADRAO };
