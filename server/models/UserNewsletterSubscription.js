const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const Modules = require('./Modules');

const UserNewsletterSubscription = sequelize.define('UserNewsletterSubscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  module_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Modules,
      key: 'module_id'
    }
  },
  topic_ids: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Array of topic IDs to subscribe to for this module'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether the subscription is active or paused'
  },
  last_sent: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time newsletter was sent for this subscription'
  }
}, {
  timestamps: true,
  tableName: 'user_newsletter_subscriptions',
  indexes: [
    {
      fields: ['user_id', 'module_id'],
      unique: true,
      comment: 'One subscription per user per module'
    },
    {
      fields: ['is_active']
    }
  ]
});

// Associations
UserNewsletterSubscription.belongsTo(User, { foreignKey: 'user_id' });
UserNewsletterSubscription.belongsTo(Modules, { foreignKey: 'module_id' });

module.exports = UserNewsletterSubscription;
