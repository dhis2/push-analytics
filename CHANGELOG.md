# Changelog

## 1.0.0 (2024-09-05)


### Features

* catch all conversion errors and take screenshots ([44f2dff](https://github.com/dhis2/push-analytics/commit/44f2dffd17338f7a09e61c1074777179fbe7d1c6))
* convert dashboard to email html ([5981e83](https://github.com/dhis2/push-analytics/commit/5981e83406615047b265a184e2367fd672eaa882))
* read scrape instructions from app root dir ([#10](https://github.com/dhis2/push-analytics/issues/10)) ([3bf208a](https://github.com/dhis2/push-analytics/commit/3bf208aa17bd9e50716075fef1e34b2f85a4375a))
* use axios to issue requests over http and https ([4bbb699](https://github.com/dhis2/push-analytics/commit/4bbb69965294eca5033e7c6ce3cc77d6d1ca56c2))
* use JSON instrcution files for dashboard conversion ([#7](https://github.com/dhis2/push-analytics/issues/7)) ([5ef3ea2](https://github.com/dhis2/push-analytics/commit/5ef3ea2925786f1bde3344b164f9daff968df8cd))
* use nodejs cluster for parallel processing ([fd8896b](https://github.com/dhis2/push-analytics/commit/fd8896b074a1d5520fc4a4e4012074a748730a48))
* user switching with the user impersonation api ([8eb6087](https://github.com/dhis2/push-analytics/commit/8eb60876cef7e1444330d01f1d026dbeebfe545f))


### Bug Fixes

* ensure maps app clears the page when done ([fe6242a](https://github.com/dhis2/push-analytics/commit/fe6242a4937199fb2c874a99ed803c1d547bfccb))
* error handling and queueing ([#12](https://github.com/dhis2/push-analytics/issues/12)) ([30a7111](https://github.com/dhis2/push-analytics/commit/30a7111b56879c2638346b1cc1a24537428207c5))
* esnure worker id is removed from idle workers when work starts ([712d18d](https://github.com/dhis2/push-analytics/commit/712d18d505dd29ffbcd499f04f0a095ff8105eb8))
* prevent multiple worker initializations ([fc5a761](https://github.com/dhis2/push-analytics/commit/fc5a7618ba0f65d7bccf8e01c69f85c986020b17))
* queue requests to ensure correct output and berhaviour ([95b0d83](https://github.com/dhis2/push-analytics/commit/95b0d8354b643800dbcc15b0177e4fe17b9405b7))
