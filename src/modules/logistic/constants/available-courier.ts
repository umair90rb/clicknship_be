interface Field {
  name: string;
  type: string;
  isOptional?: boolean;
}

export type AvailableCourierIntegrationList = {
  courier: string;
  requiredFields: Field[];
};

export const AVAILABLE_COURIER_INTEGRATION_LIST: AvailableCourierIntegrationList[] =
  [
    {
      courier: 'Leopard',
      requiredFields: [
        {
          name: 'API Key',
          type: 'string',
        },
        {
          name: 'API Password',
          type: 'string',
        },
        {
          name: 'Pickup Address Id',
          type: 'string',
        },
      ],
    },
    {
      courier: 'Deawoo',
      requiredFields: [
        {
          name: 'API Key',
          type: 'string',
        },
        {
          name: 'API Username',
          type: 'string',
        },
        {
          name: 'API Password',
          type: 'string',
        },
        {
          name: 'Pickup Address Id',
          type: 'string',
        },
      ],
    },
    {
      courier: 'PostEx',
      requiredFields: [
        {
          name: 'API Key',
          type: 'string',
        },
      ],
    },
    {
      courier: 'TCS',
      requiredFields: [
        {
          name: 'API Key',
          type: 'string',
        },
        {
          name: 'API Id',
          type: 'string',
        },
        {
          name: 'Username',
          type: 'string',
        },
        {
          name: 'Password',
          type: 'string',
        },
        {
          name: 'Pickup Address',
          type: 'string',
        },
      ],
    },
    {
      courier: 'Call Courier',
      requiredFields: [
        {
          name: 'API Key',
          type: 'string',
        },
      ],
    },
    {
      courier: 'Trax',
      requiredFields: [
        {
          name: 'API Key',
          type: 'string',
        },
      ],
    },
    {
      courier: 'M&P',
      requiredFields: [
        {
          name: 'Username',
          type: 'string',
        },
        {
          name: 'Password',
          type: 'string',
        },
      ],
    },
    {
      courier: 'Digi',
      requiredFields: [
        {
          name: 'Username',
          type: 'string',
        },
        {
          name: 'Password',
          type: 'string',
        },
        {
          name: 'Pickup Address Id',
          type: 'string',
        },
      ],
    },
    {
      courier: 'AHL',
      requiredFields: [
        {
          name: 'API Key',
          type: 'string',
        },
        {
          name: 'Account ID',
          type: 'string',
        },
        {
          name: 'Username',
          type: 'string',
        },
        {
          name: 'Password',
          type: 'string',
        },
        {
          name: 'Pickup Address Id',
          type: 'string',
        },
      ],
    },
    {
      courier: 'AHL',
      requiredFields: [
        {
          name: 'API Key',
          type: 'string',
        },
        {
          name: 'Account ID',
          type: 'string',
        },
        {
          name: 'Pickup Address Id',
          type: 'string',
        },
      ],
    },
  ];
