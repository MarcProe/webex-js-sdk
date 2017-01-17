/**!
 *
 * Copyright (c) 2015-2016 Cisco Systems, Inc. See LICENSE file.
 * @private
 */

import {SparkPlugin} from '@ciscospark/spark-core';
import Batcher from './batcher';
import ClientMetricsBatcher from './client-metrics-batcher';
import {deprecated} from 'core-decorators';

const Metrics = SparkPlugin.extend({
  children: {
    batcher: Batcher,
    clientMetricsBatcher: ClientMetricsBatcher
  },

  namespace: `Metrics`,

  @deprecated(`Metrics#sendUnstructured() is deprecated; please use Metrics#submit()`)
  sendUnstructured(key, value) {
    return this.submit(key, value);
  },

  submit(key, value) {
    return this.batcher.request(Object.assign({key}, value));
  },

  submitClientMetrics(eventName, props, preLoginId) {
    const payload = {metricName: eventName};
    if (props.tags) {
      payload.tags = props.tags;
    }
    if (props.fields) {
      payload.fields = props.fields;
    }
    if (props.type) {
      payload.type = props.type;
    }
    if (preLoginId) {
      const _payload = {
        metrics: [
          payload
        ]
      };
      // Do not batch these because pre-login events occur during onboarding, so we will be partially blind
      // to users' progress through the reg flow if we wait to persist pre-login metrics for people who drop off because
      // their metrics will not post from a queue flush in time
      this.postPreLoginMetric(_payload, preLoginId);
    } else {
      return this.clientMetricsBatcher.request(payload);
    }
  },


  /**
   * Issue request to alias a user's pre-login ID with their CI UUID
   * @param {string} preLoginId
   */
  alias: function(preLoginId) {
    var req = this.request({
      method: `POST`,
      api: `metrics`,
      resource: `clientmetrics`,
      headers: {
        "X-Prelogin-UserId": preLoginId
      },
      body: {}
    });
    req.setParameter("alias", true);
    return req;
  },

  postPreLoginMetric: function(payload, preLoginId) {
    return this.request({
      method: `POST`,
      url: 'https://metrics-a.wbx2.com/metrics/api/v1/clientmetrics-prelogin',
      headers: {
        "X-Prelogin-UserId": preLoginId,
        "content-type": "application/json",
        "charset": "utf-8"
      },
      body: payload
    });
  }


});

export default Metrics;
