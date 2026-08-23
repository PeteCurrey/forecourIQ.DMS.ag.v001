# ForecourIQ DMS — Known Issues & Limitations Ledger

**Version**: `1.0.0-rc.1`  
**Status**: All critical P0 and P1 issues are resolved. The following items represent non-blocking P2/P3 limitations safe to carry into pilot release candidate.

---

## 1. External Portal API Delays (P2)
- **Description**: Some advertising portals (e.g. eBay Motors, CarGurus) process feed updates asynchronously with batch delays up to 15–30 minutes.
- **Mitigation**: ForecourIQ DMS displays the local dispatch timestamp and queues status checks.

## 2. In-Chat Video Walkaround Transcoding (P3)
- **Description**: Team chat attachments support images and documents directly. Uploading large raw 4K smartphone video files (>100MB) without client-side downsampling may take several seconds on mobile networks.
- **Workaround**: Recommend staff record standard 1080p walkaround clips or share direct cloud links.

## 3. Safari Autoplay Restrictions for Notifications (P3)
- **Description**: Web audio chime notifications for incoming leads or team mentions require initial user interaction on Safari before sound playback is enabled by browser policy.
- **Mitigation**: Visual badges and toast notifications render immediately.
