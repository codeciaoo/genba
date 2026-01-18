/**
 * SiteRepository
 *
 * 現場/顧客データのCRUD操作を提供。
 */
import { Database, Q } from '@nozbe/watermelondb';
import { Observable } from 'rxjs';
import { BaseRepository } from './BaseRepository';
import Site, { ClientType } from '../models/Site';
import { TableNames } from '../schema';
import { setCreatedTimestamps } from '../helpers/rawHelpers';

export interface CreateSiteParams {
  name: string;
  clientName?: string;
  clientType?: ClientType;
  postalCode?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface UpdateSiteParams {
  name?: string;
  clientName?: string;
  clientType?: ClientType;
  postalCode?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  isActive?: boolean;
}

export class SiteRepository extends BaseRepository<Site> {
  protected tableName = TableNames.SITES;

  constructor(database: Database) {
    super(database);
  }

  /**
   * 現場を作成
   */
  async create(params: CreateSiteParams): Promise<Site> {
    return this.database.write(async () => {
      return this.collection.create((site) => {
        site.name = params.name;
        site.clientName = params.clientName || null;
        site.clientType = params.clientType || 'individual';
        site.postalCode = params.postalCode || null;
        site.address = params.address || null;
        site.contactName = params.contactName || null;
        site.contactPhone = params.contactPhone || null;
        site.contactEmail = params.contactEmail || null;
        site.latitude = params.latitude || null;
        site.longitude = params.longitude || null;
        site.notes = params.notes || null;
        site.isActive = true;
        site.isSynced = false;
        setCreatedTimestamps(site);
      });
    });
  }

  /**
   * 有効な現場のみ取得
   */
  async findActive(): Promise<Site[]> {
    return this.collection
      .query(Q.where('is_active', true))
      .fetch();
  }

  /**
   * 有効な現場を監視
   */
  observeActive(): Observable<Site[]> {
    return this.collection
      .query(Q.where('is_active', true), Q.sortBy('updated_at', Q.desc))
      .observe();
  }

  /**
   * 名前で検索
   */
  async searchByName(keyword: string): Promise<Site[]> {
    return this.collection
      .query(
        Q.where('is_active', true),
        Q.where('name', Q.like(`%${Q.sanitizeLikeString(keyword)}%`))
      )
      .fetch();
  }

  /**
   * GPS座標で近くの現場を検索
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 1
  ): Promise<Site[]> {
    // 簡易的な距離計算（緯度1度 ≈ 111km）
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(latitude * (Math.PI / 180)));

    return this.collection
      .query(
        Q.where('is_active', true),
        Q.where('latitude', Q.notEq(null)),
        Q.where('latitude', Q.gte(latitude - latDelta)),
        Q.where('latitude', Q.lte(latitude + latDelta)),
        Q.where('longitude', Q.gte(longitude - lngDelta)),
        Q.where('longitude', Q.lte(longitude + lngDelta))
      )
      .fetch();
  }

  /**
   * 最近使用した現場を取得
   */
  async findRecent(limit: number = 5): Promise<Site[]> {
    return this.collection
      .query(
        Q.where('is_active', true),
        Q.sortBy('updated_at', Q.desc),
        Q.take(limit)
      )
      .fetch();
  }
}
