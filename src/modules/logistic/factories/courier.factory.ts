import { Inject, Injectable } from '@nestjs/common';
import {
  AVAILABLE_COURIER_INTEGRATION_LIST,
  CourierName,
} from '../constants/available-courier';
import { ICourierService } from '../types/courier.interface';

@Injectable()
export class CourierFactory {
  constructor(
    @Inject(AVAILABLE_COURIER_INTEGRATION_LIST.dev.providerName)
    private readonly dev: ICourierService,
    // @Inject(AVAILABLE_COURIER_INTEGRATION_LIST.tcs.providerName)
    // private readonly tcs: ICourierService,
    // @Inject(AVAILABLE_COURIER_INTEGRATION_LIST.leopard.providerName)
    // private readonly leopard: ICourierService,
    // @Inject(AVAILABLE_COURIER_INTEGRATION_LIST.postex.providerName)
    // private readonly postex: ICourierService,
    // @Inject(AVAILABLE_COURIER_INTEGRATION_LIST.digi.providerName)
    // private readonly digi: ICourierService,

    // @Inject(AVAILABLE_COURIER_INTEGRATION_LIST.mnp.providerName)
    // private readonly mnp: ICourierService,
    // @Inject(AVAILABLE_COURIER_INTEGRATION_LIST.trax.providerName)
    // private readonly trax: ICourierService,
    // @Inject(AVAILABLE_COURIER_INTEGRATION_LIST.tranzo.providerName)
    // private readonly tranzo: ICourierService,
    // @Inject(AVAILABLE_COURIER_INTEGRATION_LIST.ahl.providerName)
    // private readonly ahl: ICourierService,
    // @Inject(AVAILABLE_COURIER_INTEGRATION_LIST.deawoo.providerName)
    // private readonly deawoo: ICourierService,
    // @Inject(AVAILABLE_COURIER_INTEGRATION_LIST.callcourier.providerName)
    // private readonly callcourier: ICourierService,
  ) {}

  getCourier(name: CourierName): ICourierService {
    if (process.env.NODE_ENV) {
      return this.dev;
    }
    const map = {
      // tcs: this.tcs,
      // leopard: this.leopard,
      // postex: this.postex,
      // digi: this.digi,
      // mnp: this.mnp,
      // trax: this.trax,
      // tranzo: this.tranzo,
      // ahl: this.ahl,
      // deawoo: this.deawoo,
      // callcourier: this.callcourier,
    };

    const courier = map[name];
    if (!courier) {
      throw new Error(`Courier not supported: ${name}`);
    }

    return courier;
  }
}
