import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import {
  CreateProductAttributeDto,
  CreateProductAttributeValueDto,
  CreateProductDto,
  CreateProductVariantDto,
  ListProductAttributeBodyDto,
  ListProductAttributeValueBodyDto,
  ListProductBodyDto,
  ListProductVariantBodyDto,
  SearchProductDto,
  UpdateProductAttributeDto,
  UpdateProductAttributeValueDto,
  UpdateProductDto,
  UpdateProductVariantDto,
} from '../dto/product.dto';

@Injectable()
export class ProductService {
  private select = {
    id: true,
    name: true,
    description: true,
    sku: true,
    barcode: true,
    unitPrice: true,
    costPrice: true,
    incentive: true,
    weight: true,
    unit: true,
    brand: { select: { id: true, name: true } },
    category: {
      select: {
        id: true,
        name: true,
      },
    },
    variants: {
      select: {
        id: true,
        sku: true,
        barcode: true,
        unitPrice: true,
        costPrice: true,
        active: true,
        attributes: {
          select: {
            id: true,
            attributeValue: {
              select: {
                id: true,
                value: true,
                attribute: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    },
  };
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  async list(body: ListProductBodyDto) {
    const { skip, take, ...filters } = body;
    const where: any = {};

    if (filters.unitPrice) {
      const { min, max } = filters.unitPrice;
      where.unitPrice = {};
      if (min !== undefined && min !== null && min !== '') {
        where.unitPrice.gte = Number(min);
      }
      if (max !== undefined && max !== null && max !== '') {
        where.unitPrice.lte = Number(max);
      }
    }
    if (filters.costPrice) {
      const { min, max } = filters.costPrice;
      where.costPrice = {};
      if (min !== undefined && min !== null && min !== '') {
        where.costPrice.gte = Number(min);
      }
      if (max !== undefined && max !== null && max !== '') {
        where.costPrice.lte = Number(max);
      }
    }

    if (filters.weight) {
      const { min, max } = filters.weight;
      where.weight = {};
      if (min !== undefined && min !== null && min !== '') {
        where.weight.gte = Number(min);
      }
      if (max !== undefined && max !== null && max !== '') {
        where.weight.lte = Number(max);
      }
    }

    if (filters.incentive) {
      const { min, max } = filters.incentive;
      where.incentive = {};
      if (min !== undefined && min !== null && min !== '') {
        where.incentive.gte = Number(min);
      }
      if (max !== undefined && max !== null && max !== '') {
        where.incentive.lte = Number(max);
      }
    }

    const [total, products] = await Promise.all([
      this.prismaTenant.product.count({ where }),
      this.prismaTenant.product.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        select: this.select,
      }),
    ]);

    return {
      data: products,
      meta: { total, skip, take, ...filters },
    };
  }
  get(id: number) {
    return this.prismaTenant.product.findFirst({
      where: { id },
      relationLoadStrategy: 'join',
      select: this.select,
    });
  }

  async find(body: SearchProductDto) {
    return this.prismaTenant.product.findFirst({
      where: body,
      relationLoadStrategy: 'join',
      select: this.select,
    });
  }

  async create(user: RequestUser, body: CreateProductDto) {
    const { brandId, categoryId, sku, ...product } = body;
    const skuAlreadyExit = await this.prismaTenant.product.findFirst({
      where: { sku },
    });
    if (skuAlreadyExit) {
      throw new BadRequestException('Duplicate SKU is not allowed.');
    }
    return this.prismaTenant.product.create({
      select: this.select,
      data: {
        ...product,
        sku,
        ...(brandId ? { brandId } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
    });
  }
  update(user: RequestUser, id: number, body: UpdateProductDto) {
    const { brandId, categoryId, ...product } = body;
    return this.prismaTenant.product.update({
      where: { id },
      select: this.select,
      data: {
        ...product,
        ...(brandId ? { brandId } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
    });
  }
  async delete(user: RequestUser, id: number) {
    const product = await this.prismaTenant.product.findFirst({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.prismaTenant.product.delete({ where: { id } });
  }

  // Product Attribute Methods
  private attributeSelect = {
    id: true,
    name: true,
    description: true,
    values: {
      select: {
        id: true,
        value: true,
      },
    },
  };

  async listAttributes(body: ListProductAttributeBodyDto) {
    const { skip, take } = body;
    const [total, attributes] = await Promise.all([
      this.prismaTenant.productAttribute.count(),
      this.prismaTenant.productAttribute.findMany({
        skip,
        take,
        orderBy: { id: 'desc' },
        select: this.attributeSelect,
      }),
    ]);
    return {
      data: attributes,
      meta: { total, skip, take },
    };
  }

  getAttribute(id: number) {
    return this.prismaTenant.productAttribute.findFirst({
      where: { id },
      select: this.attributeSelect,
    });
  }

  async createAttribute(body: CreateProductAttributeDto) {
    const existing = await this.prismaTenant.productAttribute.findFirst({
      where: { name: body.name },
    });
    if (existing) {
      throw new BadRequestException('Attribute with this name already exists');
    }
    return this.prismaTenant.productAttribute.create({
      data: body,
      select: this.attributeSelect,
    });
  }

  updateAttribute(id: number, body: UpdateProductAttributeDto) {
    return this.prismaTenant.productAttribute.update({
      where: { id },
      data: body,
      select: this.attributeSelect,
    });
  }

  async deleteAttribute(id: number) {
    const attribute = await this.prismaTenant.productAttribute.findFirst({
      where: { id },
    });
    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }
    return this.prismaTenant.productAttribute.delete({ where: { id } });
  }

  // Product Attribute Value Methods
  private attributeValueSelect = {
    id: true,
    value: true,
    attribute: {
      select: {
        id: true,
        name: true,
      },
    },
  };

  async listAttributeValues(body: ListProductAttributeValueBodyDto) {
    const { skip, take, attributeId } = body;
    const where: any = {};
    if (attributeId) {
      where.attributeId = attributeId;
    }
    const [total, values] = await Promise.all([
      this.prismaTenant.productAttributeValue.count({ where }),
      this.prismaTenant.productAttributeValue.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        select: this.attributeValueSelect,
      }),
    ]);
    return {
      data: values,
      meta: { total, skip, take, attributeId },
    };
  }

  getAttributeValue(id: number) {
    return this.prismaTenant.productAttributeValue.findFirst({
      where: { id },
      select: this.attributeValueSelect,
    });
  }

  async createAttributeValue(body: CreateProductAttributeValueDto) {
    const attribute = await this.prismaTenant.productAttribute.findFirst({
      where: { id: body.attributeId },
    });
    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }
    const existing = await this.prismaTenant.productAttributeValue.findFirst({
      where: { attributeId: body.attributeId, value: body.value },
    });
    if (existing) {
      throw new BadRequestException(
        'This value already exists for the attribute',
      );
    }
    return this.prismaTenant.productAttributeValue.create({
      data: body,
      select: this.attributeValueSelect,
    });
  }

  updateAttributeValue(id: number, body: UpdateProductAttributeValueDto) {
    return this.prismaTenant.productAttributeValue.update({
      where: { id },
      data: body,
      select: this.attributeValueSelect,
    });
  }

  async deleteAttributeValue(id: number) {
    const value = await this.prismaTenant.productAttributeValue.findFirst({
      where: { id },
    });
    if (!value) {
      throw new NotFoundException('Attribute value not found');
    }
    return this.prismaTenant.productAttributeValue.delete({ where: { id } });
  }

  // Product Variant Methods
  private variantSelect = {
    id: true,
    sku: true,
    barcode: true,
    unitPrice: true,
    costPrice: true,
    active: true,
    product: {
      select: {
        id: true,
        name: true,
        unitPrice: true,
        costPrice: true,
      },
    },
    attributes: {
      select: {
        id: true,
        attributeValue: {
          select: {
            id: true,
            value: true,
            attribute: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    },
  };

  async listVariants(body: ListProductVariantBodyDto) {
    const { skip, take, productId } = body;
    const where: any = {};
    if (productId) {
      where.productId = productId;
    }
    const [total, variants] = await Promise.all([
      this.prismaTenant.productVariant.count({ where }),
      this.prismaTenant.productVariant.findMany({
        where,
        skip,
        take,
        orderBy: { id: 'desc' },
        select: this.variantSelect,
      }),
    ]);
    return {
      data: variants,
      meta: { total, skip, take, productId },
    };
  }

  getVariant(id: number) {
    return this.prismaTenant.productVariant.findFirst({
      where: { id },
      select: this.variantSelect,
    });
  }

  async createVariant(body: CreateProductVariantDto) {
    const { productId, sku, attributes, ...variantData } = body;

    const product = await this.prismaTenant.product.findFirst({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const skuExists = await this.prismaTenant.productVariant.findFirst({
      where: { sku },
    });
    if (skuExists) {
      throw new BadRequestException('Duplicate variant SKU is not allowed');
    }

    return this.prismaTenant.productVariant.create({
      data: {
        ...variantData,
        sku,
        productId,
        ...(attributes?.length && {
          attributes: {
            create: attributes.map((attr) => ({
              attributeValueId: attr.attributeValueId,
            })),
          },
        }),
      },
      select: this.variantSelect,
    });
  }

  async updateVariant(id: number, body: UpdateProductVariantDto) {
    const { attributes, ...variantData } = body;

    const variant = await this.prismaTenant.productVariant.findFirst({
      where: { id },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (body.sku && body.sku !== variant.sku) {
      const skuExists = await this.prismaTenant.productVariant.findFirst({
        where: { sku: body.sku, id: { not: id } },
      });
      if (skuExists) {
        throw new BadRequestException('Duplicate variant SKU is not allowed');
      }
    }

    if (attributes !== undefined) {
      await this.prismaTenant.productVariantAttribute.deleteMany({
        where: { variantId: id },
      });
    }

    return this.prismaTenant.productVariant.update({
      where: { id },
      data: {
        ...variantData,
        ...(attributes && {
          attributes: {
            create: attributes.map((attr) => ({
              attributeValueId: attr.attributeValueId,
            })),
          },
        }),
      },
      select: this.variantSelect,
    });
  }

  async deleteVariant(id: number) {
    const variant = await this.prismaTenant.productVariant.findFirst({
      where: { id },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found');
    }
    return this.prismaTenant.productVariant.delete({ where: { id } });
  }
}
