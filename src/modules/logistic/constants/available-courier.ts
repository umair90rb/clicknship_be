export type AvailableCourierIntegrationList = {
  [key: string]: { name: string; fields: string[] };
};

export const AVAILABLE_COURIER_INTEGRATION_LIST: AvailableCourierIntegrationList =
  {
    leopard: {
      name: 'Leopard',
      fields: ['API Key', 'Api Password', 'Pickup Address Id'],
    },
    deawoo: {
      name: 'Deawoo',
      fields: ['API Key', 'API Username', 'API Password', 'Pickup Address Id'],
    },
    postex: {
      name: 'PostEx',
      fields: ['API Key'],
    },
    tcs: {
      name: 'TCS',
      fields: [
        'API Key',
        'API ID',
        'API Username',
        'API Password',
        'Pickup Address',
      ],
    },
    callcourier: { name: 'Call Courier', fields: ['API Key'] },
    trax: { name: 'Trax', fields: ['API Key'] },
    mnp: { name: 'M&P', fields: ['Username', 'Password'] },
    digi: {
      name: 'Digi',
      fields: ['Username', 'Password', 'Pickup Address ID'],
    },
    ahl: {
      name: 'AHL',
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
      fields: ['API Key', 'Account ID', 'Pickup Address ID'],
    },
  };
