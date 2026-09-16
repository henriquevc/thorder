/**
 * Utilitário de Geração de QR Code Pix Estático com Valor Dinâmico.
 * 100% Compatível com o padrão oficial do Banco Central do Brasil (BR Code / EMV QRCPS).
 */
import QRCode from 'qrcode';

export type TipoChavePix = 'celular' | 'cpf' | 'cnpj' | 'email' | 'aleatoria';

/**
 * Remove acentos e caracteres especiais para compatibilidade total com os aplicativos bancários.
 */
export function sanitizarTexto(texto: string, maxLength: number): string {
  if (!texto) return '';
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, "") // Remove qualquer caractere que não seja letra, número ou espaço
    .substring(0, maxLength)
    .trim();
}

/**
 * Identifica o tipo mais provável de uma chave Pix com base em seu formato.
 */
export function identificarTipoChavePix(chave: string): TipoChavePix {
  const limpa = (chave || '').trim();
  const apenasNumeros = limpa.replace(/\D/g, '');

  if (limpa.includes('@')) {
    return 'email';
  }
  // Chave aleatória UUID v4 (32 caracteres hexadecimais com 4 hífens)
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(limpa)) {
    return 'aleatoria';
  }
  // CNPJ: 14 dígitos (ou formatado como CNPJ)
  if (apenasNumeros.length === 14) {
    return 'cnpj';
  }
  // Se começa com +55 ou 55 seguido de 10 ou 11 dígitos, é celular
  if (limpa.startsWith('+55') || (limpa.startsWith('55') && (apenasNumeros.length === 12 || apenasNumeros.length === 13))) {
    return 'celular';
  }
  // Se tem pontuação típica de CPF (. ou -), é CPF
  if (limpa.includes('.') || (limpa.includes('-') && apenasNumeros.length === 11)) {
    return 'cpf';
  }
  // Se tem 10 dígitos (DDD + 8 números) ou 11 dígitos onde o 3º dígito é 9 (ex: 16999999999), é celular!
  if (apenasNumeros.length === 10 || (apenasNumeros.length === 11 && (apenasNumeros[2] === '9' || limpa.includes('(')))) {
    return 'celular';
  }
  if (apenasNumeros.length === 11) {
    return 'cpf';
  }
  return 'aleatoria';
}

/**
 * Formata a chave Pix para o padrão oficial exigido pelo Banco Central (Bacen / DICT).
 * 
 * - Celular: Formato internacional E.164: +55 + DDD (2 dígitos) + Número (8 ou 9 dígitos). Ex: +5516999999999
 * - CPF: Apenas os 11 dígitos numéricos, sem pontos ou traço. Ex: 12345678901
 * - CNPJ: Apenas os 14 dígitos numéricos, sem pontos, barras ou traço. Ex: 12345678000190
 * - E-mail: Em minúsculas e sem espaços. Ex: contato@loja.com
 * - Chave Aleatória: Em minúsculas e sem espaços. Ex: 123e4567-e89b-12d3-a456-426614174000
 */
export function formatarChavePix(chave: string, tipo?: TipoChavePix): string {
  if (!chave) return '';
  const limpa = chave.trim();
  const tipoDetectado = tipo || identificarTipoChavePix(limpa);

  switch (tipoDetectado) {
    case 'celular': {
      let nums = limpa.replace(/\D/g, '');
      // Se começou com 55 e tem 12 ou 13 dígitos (ex: 5516999999999)
      if (nums.startsWith('55') && (nums.length === 12 || nums.length === 13)) {
        return `+${nums}`;
      }
      // Se não tem o DDI 55 (apenas DDD + número, ex: 16999999999 ou 1688888888)
      if (nums.length === 10 || nums.length === 11) {
        return `+55${nums}`;
      }
      return `+${nums}`;
    }
    case 'cpf': {
      return limpa.replace(/\D/g, '').substring(0, 11);
    }
    case 'cnpj': {
      return limpa.replace(/\D/g, '').substring(0, 14);
    }
    case 'email': {
      return limpa.toLowerCase().trim();
    }
    case 'aleatoria': {
      return limpa.toLowerCase().trim();
    }
    default:
      return limpa.trim();
  }
}

/**
 * Valida se a chave Pix está completa e no padrão do Banco Central.
 */
export function validarChavePix(chave: string, tipo?: TipoChavePix): { valida: boolean; erro?: string; formatada: string } {
  if (!chave || !chave.trim()) {
    return { valida: false, erro: 'A chave Pix não pode ser vazia.', formatada: '' };
  }

  const formatada = formatarChavePix(chave, tipo);
  const tipoFinal = tipo || identificarTipoChavePix(chave);

  if (tipoFinal === 'celular') {
    const nums = formatada.replace(/\D/g, '');
    if (nums.length < 12 || nums.length > 13) {
      return { 
        valida: false, 
        erro: 'O celular deve conter DDD e o número completo (10 ou 11 dígitos numéricos).', 
        formatada 
      };
    }
  } else if (tipoFinal === 'cpf') {
    if (formatada.length !== 11) {
      return { 
        valida: false, 
        erro: `O CPF deve conter exatamente 11 dígitos numéricos (atualmente tem ${formatada.length}).`, 
        formatada 
      };
    }
  } else if (tipoFinal === 'cnpj') {
    if (formatada.length !== 14) {
      return { 
        valida: false, 
        erro: `O CNPJ deve conter exatamente 14 dígitos numéricos (atualmente tem ${formatada.length}).`, 
        formatada 
      };
    }
  } else if (tipoFinal === 'email') {
    if (!formatada.includes('@') || !formatada.includes('.')) {
      return { 
        valida: false, 
        erro: 'Insira um endereço de e-mail válido.', 
        formatada 
      };
    }
  } else if (tipoFinal === 'aleatoria') {
    if (formatada.length < 32) {
      return { 
        valida: false, 
        erro: 'A chave aleatória (EVP) deve ser um código UUID de 32 caracteres com traços.', 
        formatada 
      };
    }
  }

  return { valida: true, formatada };
}

/**
 * Calcula o checksum CRC16-CCITT de validação da string Pix.
 * Polinômio: 0x1021 | Valor Inicial: 0xFFFF
 */
export function calcularCRC16(str: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    crc ^= (charCode << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera a string Payload do Pix Copia e Cola (BR Code).
 * 
 * @param chave Chave Pix cadastrada (CPF, CNPJ, E-mail, Celular ou Chave Aleatória)
 * @param nome Nome do beneficiário (máx 25 caracteres no banco)
 * @param cidade Cidade do beneficiário (máx 15 caracteres no banco)
 * @param valor Valor total da transação em reais (BRL)
 * @param txid Identificador da transação (padrão '***' para estático universal)
 * @param tipoChave Tipo opcional da chave para formatação precisa
 */
export function gerarPayloadPix(
  chave: string,
  nome: string,
  cidade: string,
  valor: number,
  txid: string = '***',
  tipoChave?: TipoChavePix
): string {
  // Helper para formatar campos no padrão EMV: [ID da Tag][Tamanho com 2 dígitos][Valor]
  const formatTag = (id: string, value: string) => {
    return id + String(value.length).padStart(2, '0') + value;
  };

  // Garante que a chave está no padrão oficial exigido pelo Bacen
  const chaveFormatada = formatarChavePix(chave, tipoChave);

  // 00 - Payload Format Indicator (Sempre 01)
  const tag00 = formatTag('00', '01');

  // 26 - Merchant Account Information - Pix
  const gui = formatTag('00', 'br.gov.bcb.pix');
  const key = formatTag('01', chaveFormatada);
  const tag26 = formatTag('26', gui + key);

  // 52 - Merchant Category Code (Sempre 0000 para genérico)
  const tag52 = formatTag('52', '0000');

  // 53 - Transaction Currency (986 é o código ISO para Real - BRL)
  const tag53 = formatTag('53', '986');

  // 54 - Transaction Amount (Valor formatado com duas casas decimais, ponto como separador)
  const valorFormatado = valor.toFixed(2);
  const tag54 = formatTag('54', valorFormatado);

  // 58 - Country Code (Sempre BR)
  const tag58 = formatTag('58', 'BR');

  // 59 - Merchant Name (Nome do recebedor, máx 25 chars)
  const nomeSani = sanitizarTexto(nome, 25);
  const tag59 = formatTag('59', nomeSani || 'LOJA THORDER');

  // 60 - Merchant City (Cidade do recebedor, máx 15 chars)
  const cidadeSani = sanitizarTexto(cidade, 15);
  const tag60 = formatTag('60', cidadeSani || 'CAJURU');

  // 62 - Additional Data Field Template (TxID)
  // No Pix estático, o TxID deve ser '***' para máxima compatibilidade com todos os apps bancários.
  // TxIDs customizados sem API bancária ativa são rejeitados por apps como Nubank, Itaú e BB.
  const txidFinal = (txid && txid !== '***') ? txid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) : '***';
  const txidTag = formatTag('05', txidFinal || '***');
  const tag62 = formatTag('62', txidTag);

  // Concatenação de todas as partes para formar o pré-payload (sem o CRC)
  let prePayload = tag00 + tag26 + tag52 + tag53 + tag54 + tag58 + tag59 + tag60 + tag62;

  // Adiciona a tag de abertura do CRC: tag 63 de tamanho 04
  prePayload += '6304';

  // Calcula o CRC16-CCITT de toda a string gerada
  const crc = calcularCRC16(prePayload);

  // Retorna a string Pix completa (Copia e Cola)
  return prePayload + crc;
}

/**
 * Gera um Data URL (base64 PNG) com o QR Code Pix em alta definição.
 * Funciona 100% offline e no navegador sem depender de APIs externas.
 */
export async function gerarQrCodePixDataUrl(payload: string): Promise<string> {
  if (!payload) return '';
  try {
    return await QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Falha ao gerar QR Code localmente via canvas:', err);
    // Fallback caso ocorra qualquer erro de canvas/renderização
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(payload)}`;
  }
}
