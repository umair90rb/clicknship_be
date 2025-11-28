export type AvailableCourierIntegrationList = {
  [key: string]: { name: string; providerName: string; fields: string[] };
};

export const AVAILABLE_COURIER_INTEGRATION_LIST: AvailableCourierIntegrationList =
  {
    dev: {
      name: 'Dev Courier',
      providerName: 'DEV_COURIER',
      fields: [],
    },
    leopard: {
      name: 'Leopard',
      providerName: 'LEOPARD_COURIER',
      fields: ['API Key', 'Api Password', 'Pickup Address Id'],
    },
    deawoo: {
      name: 'Deawoo',
      providerName: 'DEAWOO_COURIER',
      fields: ['API Key', 'API Username', 'API Password', 'Pickup Address Id'],
    },
    postex: {
      name: 'PostEx',
      providerName: 'POSTEX_COURIER',
      fields: ['API Key'],
    },
    tcs: {
      name: 'TCS',
      providerName: 'TCS_COURIER',
      fields: [
        'API Key',
        'API ID',
        'API Username',
        'API Password',
        'Pickup Address',
      ],
    },
    callcourier: {
      name: 'Call Courier',
      providerName: 'CALL_COURIER',
      fields: ['API Key'],
    },
    trax: { name: 'Trax', providerName: 'TRAX_COURIER', fields: ['API Key'] },
    mnp: {
      name: 'M&P',
      providerName: 'MNP_COURIER',
      fields: ['Username', 'Password'],
    },
    digi: {
      name: 'Digi',
      providerName: 'DIGI_COURIER',
      fields: ['Username', 'Password', 'Pickup Address ID'],
    },
    ahl: {
      name: 'AHL',
      providerName: 'AHL_COURIER',
      fields: [
        'API Key',
        'Account ID',
        'Username',
        'Password',
        'Pickup Address ID',
      ],
    },
    tranzo: {
      name: 'Tranzo',
      providerName: 'TRANZO_COURIER',
      fields: ['API Key', 'Account ID', 'Pickup Address ID'],
    },
  };

export type CourierName = keyof typeof AVAILABLE_COURIER_INTEGRATION_LIST;
